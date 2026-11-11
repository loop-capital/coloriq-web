import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/sessions/[code]/complete
 *
 * Replaces the former 501 stub. Completes a formulation session once every
 * required angle (roots, mid, ends) has an uploaded photo with a completed
 * analysis row, then:
 *   1. Aggregates the per-angle color profiles from the completed analyses
 *      (values are copied verbatim from analysis results — never synthesized).
 *   2. Persists the aggregated profile as a `formulations` row via the same
 *      model/shape `POST /api/formulations/save` uses. The row carries the
 *      observed profile only: it has no recipe steps, because generating a
 *      recipe requires a target look (`/api/formulate` needs targetLevel /
 *      targetTone plus a single current level) and completion does not invent
 *      one. When the caller supplies targetLevel / targetTone /
 *      brandPreference in the body, they are validated and stored on the
 *      formulation record for the formulate flow to use.
 *   3. Marks the session 'completed' (completedAt) and consumes the session
 *      code when completion was resolved via a code.
 *
 * Session resolution mirrors GET /api/sessions/[code]: an unused, unexpired
 * 4-digit code first, then a direct session UUID. No auth is required — the
 * code (or UUID) is the credential, exactly as on the sibling session routes.
 *
 * Failure modes (never invented data, never 5xx for caller-fixable problems):
 *   404: unknown, expired, or already-used code / unknown session id.
 *   422: missing angles, any photo without a completed usable analysis,
 *        or no resolvable stylist to own the formulation row.
 *   400: malformed optional target fields in the request body.
 *   200: session already completed (idempotent replay; no duplicate
 *        formulation is created).
 *
 * Notes on what "completed analysis" means: `POST /api/photos/[id]/analyze`
 * sets `processing_status = 'completed'` and writes the analysis into the
 * `results` JSON column. That is the definition used here. The
 * `color_extractions` table has no writers in the codebase, so it is not
 * consulted by this endpoint.
 */

const REQUIRED_ANGLES = ['roots', 'mid', 'ends'] as const;
type Angle = (typeof REQUIRED_ANGLES)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ParsedAnalysis {
  level: number;
  tone: string;
  grayPercent: number | null;
  dominantHex: string | null;
  confidence: number | null;
  condition: string | null;
}

interface AngleProfile extends ParsedAnalysis {
  photoId: string;
  angle: Angle;
}

/**
 * Extract the fields completion needs from an analysis `results` JSON value.
 * Returns null when the value is not a usable completed analysis (missing or
 * out-of-range level, missing tone). Every other field is optional and
 * degrades to null rather than blocking completion.
 */
function parseAnalysisResult(results: unknown): ParsedAnalysis | null {
  if (!results || typeof results !== 'object') return null;
  const r = results as Record<string, unknown>;
  const level = r.currentLevel;
  const tone = r.currentTone;
  if (typeof level !== 'number' || !Number.isFinite(level) || level < 1 || level > 10) return null;
  if (typeof tone !== 'string' || tone.length === 0) return null;
  return {
    level,
    tone,
    grayPercent: typeof r.grayPercent === 'number' ? r.grayPercent : null,
    dominantHex: typeof r.dominantHex === 'string' ? r.dominantHex : null,
    confidence: typeof r.confidence === 'number' ? r.confidence : null,
    condition: typeof r.condition === 'string' ? r.condition : null,
  };
}

/** Latest row by created_at (nulls sort as oldest); falls back to list order. */
function latestRow<T extends { created_at: Date | null }>(rows: T[]): T {
  let best = rows[0];
  for (const row of rows) {
    const t = row.created_at?.getTime() ?? -1;
    const bt = best.created_at?.getTime() ?? -1;
    if (t >= bt) best = row;
  }
  return best;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // ─── Resolve the session: unused + unexpired code, else direct UUID ───
    // Mirrors GET /api/sessions/[code] and POST /api/sessions/[code]/upload.
    const sessionCode = await prisma.session_codes.findFirst({
      where: { code, used: false, expiresAt: { gt: new Date() } },
    });

    const session = sessionCode?.formulationSessionId
      ? await prisma.formulation_sessions.findUnique({
          where: { id: sessionCode.formulationSessionId },
        })
      : UUID_RE.test(code)
        ? await prisma.formulation_sessions.findUnique({ where: { id: code } })
        : null;

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or code expired' },
        { status: 404 }
      );
    }

    // Idempotent replay: never create a second formulation for a session
    // that already completed.
    if (session.status === 'completed') {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        data: {
          sessionId: session.id,
          status: session.status,
          completedAt: session.completedAt?.toISOString() ?? null,
        },
      });
    }

    // ─── Optional target fields (validated, never defaulted) ──────────────
    // The caller may record the target look for the formulate flow. An
    // absent target is normal: completion records the observed profile and
    // does not invent a target or a recipe.
    const rawBody: unknown = await request.json().catch(() => ({}));
    const body: Record<string, unknown> =
      rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
        ? (rawBody as Record<string, unknown>)
        : {};

    let targetLevel: number | null = null;
    let targetTone: string | null = null;
    let brandPreference: string | null = null;

    if (body.targetLevel !== undefined && body.targetLevel !== null) {
      if (
        typeof body.targetLevel !== 'number' ||
        !Number.isInteger(body.targetLevel) ||
        body.targetLevel < 1 ||
        body.targetLevel > 10
      ) {
        return NextResponse.json(
          { error: 'targetLevel must be an integer between 1 and 10' },
          { status: 400 }
        );
      }
      targetLevel = body.targetLevel;
    }
    if (body.targetTone !== undefined && body.targetTone !== null) {
      if (typeof body.targetTone !== 'string' || body.targetTone.length === 0) {
        return NextResponse.json(
          { error: 'targetTone must be a non-empty string' },
          { status: 400 }
        );
      }
      targetTone = body.targetTone;
    }
    if (body.brandPreference !== undefined && body.brandPreference !== null) {
      if (typeof body.brandPreference !== 'string' || body.brandPreference.length === 0) {
        return NextResponse.json(
          { error: 'brandPreference must be a non-empty string' },
          { status: 400 }
        );
      }
      brandPreference = body.brandPreference;
    }

    // ─── Load the session's photos ────────────────────────────────────────
    // photos/upload stores the session id in photo_label (there is no
    // session_id column) and the angle in photo_type.
    const photos = await prisma.photo_analyses.findMany({
      where: { photo_label: session.id },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        photo_type: true,
        photo_label: true,
        processing_status: true,
        results: true,
        stylist_id: true,
        created_at: true,
      },
    });

    // Step 1: every required angle must have at least one uploaded photo.
    const missingAngles = REQUIRED_ANGLES.filter(
      (angle) => !photos.some((p) => p.photo_type === angle)
    );
    if (missingAngles.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot complete session: missing photo angles: ${missingAngles.join(', ')}`,
          missingAngles,
        },
        { status: 422 }
      );
    }

    // Step 2: every photo linked to this session must have a completed,
    // usable analysis. Any pending / failed / unusable row blocks completion
    // and is named — its values are never synthesized.
    const incompletePhotos: { id: string; angle: string; status: string | null }[] = [];
    const parsedByPhoto = new Map<string, ParsedAnalysis>();
    for (const photo of photos) {
      const parsed = parseAnalysisResult(photo.results);
      if (photo.processing_status !== 'completed' || !parsed) {
        incompletePhotos.push({
          id: photo.id,
          angle: photo.photo_type,
          status: photo.processing_status,
        });
      } else {
        parsedByPhoto.set(photo.id, parsed);
      }
    }
    if (incompletePhotos.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot complete session: some photos lack a completed analysis',
          incompletePhotos,
        },
        { status: 422 }
      );
    }

    // Step 3: aggregate per-angle profiles from the completed analyses.
    // Latest completed row per angle wins; values are verbatim from the
    // analysis results. The only derived numbers are the observed level
    // range (min/max of the three verbatim levels) and, below, the mean of
    // the verbatim confidences.
    const profiles = {} as Record<Angle, AngleProfile>;
    for (const angle of REQUIRED_ANGLES) {
      const rows = photos.filter((p) => p.photo_type === angle);
      const latest = latestRow(rows);
      const parsed = parsedByPhoto.get(latest.id);
      if (!parsed) {
        // Unreachable: missing angles and incomplete photos were rejected
        // above, but guard rather than crash.
        return NextResponse.json(
          { error: `Cannot complete session: no usable analysis for angle: ${angle}` },
          { status: 422 }
        );
      }
      profiles[angle] = { photoId: latest.id, angle, ...parsed };
    }

    const levels = REQUIRED_ANGLES.map((angle) => profiles[angle].level);
    // Spread into fresh object literals so the value satisfies Prisma's
    // InputJsonObject (named interfaces carry no index signature).
    const aggregate: Prisma.InputJsonObject = {
      sessionId: session.id,
      source: 'session-completion',
      angles: {
        roots: { ...profiles.roots },
        mid: { ...profiles.mid },
        ends: { ...profiles.ends },
      },
      levelRange: { min: Math.min(...levels), max: Math.max(...levels) },
      photoIds: photos.map((p) => p.id),
    };

    // ─── Resolve the stylist who owns the formulation row ─────────────────
    // formulations.stylist_id is a required FK. Prefer the session's own
    // stylist; otherwise the photos' stylist when they agree on exactly one
    // (photos/upload resolves a real stylist from auth). Anything else is
    // ambiguous and fails loudly instead of guessing an owner.
    let stylistId: string | null = session.stylistId;
    if (!stylistId) {
      const photoStylistIds = [
        ...new Set(
          photos
            .map((p) => p.stylist_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        ),
      ];
      if (photoStylistIds.length === 1) stylistId = photoStylistIds[0];
    }
    if (!stylistId) {
      return NextResponse.json(
        {
          error:
            'Cannot complete session: no stylist to own the formulation (session has no stylist and its photos do not agree on one)',
        },
        { status: 422 }
      );
    }
    const stylist = await prisma.stylists.findUnique({ where: { id: stylistId } });
    if (!stylist) {
      return NextResponse.json(
        { error: 'Cannot complete session: session stylist not found' },
        { status: 422 }
      );
    }

    // Step 4 + 5, atomically: persist the formulation, mark the session
    // completed, consume the code. One transaction so a retry can never
    // create a duplicate formulation for the same session.
    const confidences = REQUIRED_ANGLES.map((angle) => profiles[angle].confidence).filter(
      (c): c is number => typeof c === 'number'
    );
    const confidenceScore =
      confidences.length > 0
        ? Math.round(
            (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 1000
          ) / 1000
        : null;

    const completedAt = new Date();
    const { formulation } = await prisma.$transaction(async (tx) => {
      const formulation = await tx.formulations.create({
        data: {
          stylist_id: stylistId,
          client_id: session.clientId,
          input_data: aggregate,
          brand: brandPreference,
          target_level: targetLevel !== null ? String(targetLevel) : null,
          target_tone: targetTone,
          // Observed profile only: no recipe steps. Recipe generation lives
          // in /api/formulate and needs a target look plus a single current
          // level — completion invents neither.
          primary_formula: { steps: [], ingredients: [], warnings: [] },
          confidence_score: confidenceScore,
          status: 'generated',
        },
      });
      await tx.formulation_sessions.update({
        where: { id: session.id },
        data: { status: 'completed', completedAt },
      });
      if (sessionCode) {
        await tx.session_codes.update({
          where: { id: sessionCode.id },
          data: { used: true },
        });
      }
      return { formulation };
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        status: 'completed',
        completedAt: completedAt.toISOString(),
        formulationId: formulation.id,
        aggregate,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
