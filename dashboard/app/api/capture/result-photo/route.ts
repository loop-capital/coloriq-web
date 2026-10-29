import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { getOrCreateStylistForUser, getSalonIdForUser } from '@/lib/stylist';
import { isValidHandoffId } from '@/lib/result-handoff';

/**
 * POST /api/capture/result-photo — Phase 1 item 6 writer for
 * color_bar_sessions.result_photo_url.
 *
 * Called by the capture client when a photo uploaded via a Results-step
 * handoff completes. It is independent of item 5's upload parameter: it
 * records the photo URL the client already received from /api/photos/upload,
 * keyed to the handoff's session/formulation references.
 *
 * Request body (JSON):
 *   - sessionId?: string (formulation_sessions.id, UUID)
 *   - formulationId?: string (formulations.id, UUID)
 *   - photoUrl: string (required, the uploaded photo's public URL)
 *   - replace?: boolean (default false)
 *
 * ROW-RESOLUTION RULE (in order):
 *   1. If formulationId is given, find the most recent color_bar_sessions
 *      row with formula_id = formulationId AND stylist_id = the caller.
 *      (formula_id's domain is not assumed: the color-bar flow may store a
 *      different formula id family, in which case this simply finds nothing
 *      and step 2 applies.)
 *   2. Otherwise create a new color_bar_sessions row in the existing shape
 *      (salon_id / stylist_id / client_id / formula_id / status 'active'),
 *      with client_id resolved from the formulations row first, then the
 *      formulation_sessions row, and salon_id from the formulation_sessions
 *      row first, then the caller's linked salon. If no salon can be
 *      resolved the write is refused (400) — never written to a wrong row.
 *
 * OVERWRITE RULE: first photo wins. If the resolved row already has a
 * result_photo_url, it is left untouched and the response reports
 * updated:false / reason:'already_set' — unless replace:true is passed
 * explicitly, in which case the URL is overwritten. Concurrent first
 * uploads race server-side; the first writer call wins.
 *
 * Responses:
 *   200: { success, updated, colorBarSessionId, resultPhotoUrl, reason? }
 *   201: same + created:true (a new row was created)
 *   400: missing/invalid fields, or no salon resolvable for creation
 *   401: unauthenticated · 404: unknown sessionId/formulationId
 */
export async function POST(request: NextRequest) {
  try {
    // ─── Auth check (same pattern as /api/photos/upload) ──────────────
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Authentication required.' },
        { status: 401 }
      );
    }

    const stylist = await getOrCreateStylistForUser(authUser.userId);
    if (!stylist) {
      return NextResponse.json(
        { error: 'No creator profile for this account.' },
        { status: 400 }
      );
    }
    const stylistId = stylist.id;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    const { sessionId, formulationId, photoUrl, replace } = body as {
      sessionId?: unknown;
      formulationId?: unknown;
      photoUrl?: unknown;
      replace?: unknown;
    };

    if (!photoUrl || typeof photoUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: photoUrl' },
        { status: 400 }
      );
    }
    if (
      sessionId !== undefined &&
      sessionId !== null &&
      !isValidHandoffId(sessionId as string)
    ) {
      return NextResponse.json(
        { error: 'Invalid sessionId: must be a UUID.' },
        { status: 400 }
      );
    }
    if (
      formulationId !== undefined &&
      formulationId !== null &&
      !isValidHandoffId(formulationId as string)
    ) {
      return NextResponse.json(
        { error: 'Invalid formulationId: must be a UUID.' },
        { status: 400 }
      );
    }
    if (!sessionId && !formulationId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId or formulationId' },
        { status: 400 }
      );
    }

    // ─── Existence checks (shape was validated above; existence here) ──
    let session = null as Awaited<
      ReturnType<typeof prisma.formulation_sessions.findUnique>
    > | null;
    let formulation = null as Awaited<
      ReturnType<typeof prisma.formulations.findUnique>
    > | null;
    if (sessionId) {
      session = await prisma.formulation_sessions.findUnique({
        where: { id: sessionId as string },
      });
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found.' },
          { status: 404 }
        );
      }
    }
    if (formulationId) {
      formulation = await prisma.formulations.findUnique({
        where: { id: formulationId as string },
      });
      if (!formulation) {
        return NextResponse.json(
          { error: 'Formulation not found.' },
          { status: 404 }
        );
      }
    }

    // ─── Row resolution: caller's own row for this formulation, else new ─
    let row = null as Awaited<
      ReturnType<typeof prisma.color_bar_sessions.findFirst>
    > | null;
    if (formulationId) {
      row = await prisma.color_bar_sessions.findFirst({
        where: {
          formula_id: formulationId as string,
          stylist_id: stylistId,
        },
        orderBy: { created_at: 'desc' },
      });
    }

    if (row) {
      if (row.result_photo_url && replace !== true) {
        return NextResponse.json({
          success: true,
          updated: false,
          reason: 'already_set',
          colorBarSessionId: row.id,
          resultPhotoUrl: row.result_photo_url,
        });
      }
      row = await prisma.color_bar_sessions.update({
        where: { id: row.id },
        data: { result_photo_url: photoUrl },
      });
      return NextResponse.json({
        success: true,
        updated: true,
        colorBarSessionId: row.id,
        resultPhotoUrl: row.result_photo_url,
      });
    }

    const salonId =
      session?.salonId ?? (await getSalonIdForUser(authUser.userId));
    if (!salonId) {
      return NextResponse.json(
        { error: 'No salon linked to this account; cannot create a result row.' },
        { status: 400 }
      );
    }

    row = await prisma.color_bar_sessions.create({
      data: {
        salon_id: salonId,
        stylist_id: stylistId,
        client_id: formulation?.client_id ?? session?.clientId ?? null,
        formula_id: (formulationId as string | undefined) ?? null,
        status: 'active',
        result_photo_url: photoUrl,
      },
    });
    return NextResponse.json(
      {
        success: true,
        updated: true,
        created: true,
        colorBarSessionId: row.id,
        resultPhotoUrl: row.result_photo_url,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to record result photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
