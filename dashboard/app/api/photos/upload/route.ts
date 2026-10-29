import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, getPresignedUploadUrl, R2_PUBLIC_URL } from '@/lib/r2';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { getOrCreateStylistForUser } from '@/lib/stylist';
import {
  resolvePairingReferences,
  buildPhotoSidecar,
  photoSidecarKey,
} from '@/lib/photo-pairing';

/**
 * POST /api/photos/upload
 * Upload a photo for camera capture analysis.
 *
 * Supports two upload modes:
 * 1. Direct upload: Multipart form data with file
 * 2. Presigned URL: Returns a signed URL for client-side R2 upload
 *
 * Request body (multipart):
 *   - file: File (image/jpeg, image/png, image/webp; max 5MB)
 *   - sessionId: string (required, links to photo session)
 *   - angle: "roots" | "mid" | "ends" (required)
 *   - formulaId: string (optional, a formulations.id — the generated
 *     formulation this capture is tied to, when the capture context has one)
 *
 * Request body (presigned URL mode):
 *   - sessionId: string (required)
 *   - angle: "roots" | "mid" | "ends" (required)
 *   - contentType: string (e.g., "image/jpeg")
 *   - contentLength: number (bytes)
 *   - formulaId: string (optional, as above)
 *
 * Phase 1 item 5 — pairing at capture: every upload records its pairing in
 * two places, written by this handler (never backfilled):
 *   1. the photo_analyses row — session_id (FK, only when sessionId resolves
 *      to a formulation_sessions row; the capture UI's client-generated uid
 *      does not resolve and keeps photo_label as its only session link) and
 *      formulation_id (FK, only when formulaId is supplied and resolves).
 *      photo_label still carries the raw sessionId string (existing behavior).
 *   2. a JSON sidecar in R2 next to the photo key
 *      (`photos/{sessionId}/{angle}-{ts}.json`): session id, formula id when
 *      supplied, angle, timestamp. The sidecar is written before the row, so
 *      a sidecar write failure fails the upload before any row is created,
 *      rather than recording a photo without its pairing.
 * When no formula context exists, formulation_id stays null — never invented,
 * never inferred from timestamps, similarity, or later data.
 *
 * Response:
 *   201: { success: true, data: { id, url, uploadUrl?, formulationId, sidecarKey, ... } }
 *   400: { error: "Missing required fields" | "Unknown formulaId: ..." }
 *   413: { error: "File too large. Maximum size is 5MB" }
 *   415: { error: "Unsupported file type" }
 */
export async function POST(request: NextRequest) {
  try {
    // ─── Auth check ──────────────────────────────────────────────
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Authentication required.' },
        { status: 401 }
      );
    }

    // photo_analyses.stylist_id has a real FK to stylists.id, which is NOT the
    // same as users.id (a prior version of this file assumed they were equal —
    // they aren't; see prisma/migrations/20260917000000_.../migration.sql for
    // the users<->stylists bridge). Resolve the real linked stylist instead.
    const stylist = await getOrCreateStylistForUser(authUser.userId);
    if (!stylist) {
      return NextResponse.json(
        { error: 'No creator profile for this account.' },
        { status: 400 }
      );
    }
    const stylistId = stylist.id;

    const contentType = request.headers.get('content-type') || '';

    // Presigned URL mode (JSON request)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { sessionId, angle, contentType: fileContentType, contentLength, formulaId } = body;

      if (!sessionId || !angle) {
        return NextResponse.json(
          { error: 'Missing required fields: sessionId, angle' },
          { status: 400 }
        );
      }

      const validAngles = ['roots', 'mid', 'ends'];
      if (!validAngles.includes(angle)) {
        return NextResponse.json(
          { error: `Invalid angle. Must be one of: ${validAngles.join(', ')}` },
          { status: 400 }
        );
      }

      if (contentLength && contentLength > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 5MB' },
          { status: 413 }
        );
      }

      // Phase 1 item 5: resolve pairing before anything is recorded. A
      // supplied-but-unknown formulaId is a 400 — never record a dangling
      // formula link. An unresolvable sessionId is NOT an error (existing
      // callers pass client-generated uids); its FK simply stays null.
      let pairing;
      try {
        pairing = await resolvePairingReferences(prisma, sessionId, formulaId ?? null);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Invalid formulaId' },
          { status: 400 }
        );
      }

      const mimeType = fileContentType || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      const ts = Date.now();
      const key = `photos/${sessionId}/${angle}-${ts}.${ext}`;
      const sidecarKey = photoSidecarKey(key);

      const uploadUrl = await getPresignedUploadUrl(key, mimeType);
      const publicUrl = `${R2_PUBLIC_URL}/${key}`;

      const photoId = crypto.randomUUID();
      const capturedAt = new Date();

      // Sidecar first, then the row: a failed upload leaves no DB row
      // claiming a pairing whose sidecar was never written. (In presigned
      // mode the sidecar lands before the client PUTs the photo bytes —
      // same pre-existing semantics as the row, which is also created
      // before the PUT completes.)
      await uploadToR2(
        sidecarKey,
        Buffer.from(
          JSON.stringify(
            buildPhotoSidecar({
              photoId,
              sessionId,
              sessionReference: pairing.sessionReference,
              formulationId: pairing.formulationId,
              angle,
              photoKey: key,
              capturedAt,
            }),
            null,
            2
          )
        ),
        'application/json'
      );

      // Save record to Prisma so /api/photos/[id]/analyze can find it
      await prisma.photo_analyses.create({
        data: {
          id: photoId,
          stylist_id: stylistId,
          photo_type: angle,
          photo_label: sessionId,
          session_id: pairing.sessionReference,
          formulation_id: pairing.formulationId,
          original_url: publicUrl,
          file_size_bytes: contentLength ?? null,
          format: ext,
          processing_status: 'pending',
          created_at: capturedAt,
        },
      });

      const photo = {
        id: photoId,
        sessionId,
        angle,
        uploadUrl,
        url: publicUrl,
        original_url: publicUrl,
        format: ext,
        file_size_bytes: contentLength,
        width: null,
        height: null,
        analysisStatus: 'pending',
        createdAt: capturedAt.toISOString(),
        key,
        formulationId: pairing.formulationId,
        sidecarKey,
      };

      return NextResponse.json({ success: true, data: photo }, { status: 201 });
    }

    // Direct upload mode (multipart form data)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('sessionId') as string | null;
    const angle = formData.get('angle') as string | null;
    const formulaId = formData.get('formulaId') as string | null;

    if (!file || !sessionId || !angle) {
      return NextResponse.json(
        { error: 'Missing required fields: file, sessionId, angle' },
        { status: 400 }
      );
    }

    const validAngles = ['roots', 'mid', 'ends'];
    if (!validAngles.includes(angle)) {
      return NextResponse.json(
        { error: `Invalid angle. Must be one of: ${validAngles.join(', ')}` },
        { status: 400 }
      );
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type. Must be one of: ${validTypes.join(', ')}` },
        { status: 415 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 413 }
      );
    }

    // Phase 1 item 5: same pairing resolution as presigned mode (see above).
    let pairing;
    try {
      pairing = await resolvePairingReferences(prisma, sessionId, formulaId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid formulaId' },
        { status: 400 }
      );
    }

    const ext = file.type.split('/')[1] || 'jpg';
    const ts = Date.now();
    const key = `photos/${sessionId}/${angle}-${ts}.${ext}`;
    const sidecarKey = photoSidecarKey(key);
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadToR2(key, buffer, file.type);

    const photoId = crypto.randomUUID();
    const capturedAt = new Date();

    // Sidecar first, then the row (see presigned mode note above).
    await uploadToR2(
      sidecarKey,
      Buffer.from(
        JSON.stringify(
          buildPhotoSidecar({
            photoId,
            sessionId,
            sessionReference: pairing.sessionReference,
            formulationId: pairing.formulationId,
            angle,
            photoKey: key,
            capturedAt,
          }),
          null,
          2
        )
      ),
      'application/json'
    );

    // Save record to Prisma so /api/photos/[id]/analyze can find it
    await prisma.photo_analyses.create({
      data: {
        id: photoId,
        stylist_id: stylistId,
        photo_type: angle,
        photo_label: sessionId,
        session_id: pairing.sessionReference,
        formulation_id: pairing.formulationId,
        original_url: publicUrl,
        file_size_bytes: file.size,
        format: ext,
        processing_status: 'pending',
        created_at: capturedAt,
      },
    });

    const photo = {
      id: photoId,
      sessionId,
      angle,
      url: publicUrl,
      original_url: publicUrl,
      file_size_bytes: file.size,
      format: ext,
      width: null,
      height: null,
      analysisStatus: 'pending',
      createdAt: capturedAt.toISOString(),
      key,
      formulationId: pairing.formulationId,
      sidecarKey,
    };

    return NextResponse.json({ success: true, data: photo }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
