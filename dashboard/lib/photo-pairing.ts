/**
 * Phase 1 item 5 — photo→formula pairing at capture.
 *
 * A photo must carry its formula reference in photo metadata AT CAPTURE,
 * never reconstructed afterward (SocialStudio integration ruling, 2026-10-28).
 * The pairing is recorded in two places by the upload path itself:
 *   1. the photo_analyses row (session_id + formulation_id FK columns), and
 *   2. a JSON sidecar object in R2 next to the photo key.
 *
 * Vocabulary (do not blur these):
 * - sessionId: the raw string the caller supplies. The capture UI's session id
 *   is a client-generated uid (`${Date.now()}-${random}`), NOT a
 *   formulation_sessions id — so it only resolves to a real FK when it
 *   actually is a formulation_sessions UUID. Otherwise the FK stays null and
 *   photo_label keeps carrying the raw string (existing behavior).
 * - formulaId (request param): the GENERATED formulation's id
 *   (formulations.id, produced by the formulate flow). It is NOT a
 *   formulas.id (saved reusable formula) and NOT a formula_listings id.
 *   When no formula context exists, formulation_id stays null — never
 *   invented, never inferred from timestamps, similarity, or later data.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Minimal Prisma surface the pairing resolution needs (real client or test fake). */
export type PairingDb = {
  formulation_sessions: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
  };
  formulations: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
  };
};

export type PairingReferences = {
  /** formulation_sessions.id when sessionId resolves to a real session, else null. */
  sessionReference: string | null;
  /** formulations.id when a formulaId was supplied and resolves, else null. */
  formulationId: string | null;
};

/**
 * Resolve the pairing references for one upload.
 * - Session: resolve-or-null. Existing callers pass client-generated uids
 *   that are not formulation_sessions rows; those must keep working, so an
 *   unresolvable sessionId yields null, never an error.
 * - Formula: supplied-but-unknown is an error. A formulaId is new input with
 *   no existing callers, and recording a dangling reference would be worse
 *   than refusing the upload. The route maps this to 400.
 */
export async function resolvePairingReferences(
  db: PairingDb,
  sessionId: string,
  formulaId: string | null | undefined,
): Promise<PairingReferences> {
  let sessionReference: string | null = null;
  if (isUuid(sessionId)) {
    const session = await db.formulation_sessions.findUnique({ where: { id: sessionId } });
    sessionReference = session ? session.id : null;
  }

  let formulationId: string | null = null;
  if (formulaId !== null && formulaId !== undefined && formulaId !== '') {
    if (!isUuid(formulaId)) {
      throw new Error(`Unknown formulaId: ${formulaId}`);
    }
    const formulation = await db.formulations.findUnique({ where: { id: formulaId } });
    if (!formulation) {
      throw new Error(`Unknown formulaId: ${formulaId}`);
    }
    formulationId = formulation.id;
  }

  return { sessionReference, formulationId };
}

export type PhotoSidecar = {
  version: 1;
  photoId: string;
  /** Raw sessionId string as supplied by the caller. */
  sessionId: string;
  /** formulation_sessions.id when resolved, else null. */
  sessionReference: string | null;
  /** formulations.id when formula context was supplied, else null. */
  formulationId: string | null;
  angle: string;
  photoKey: string;
  /** ISO 8601 timestamp of the upload request that wrote this sidecar. */
  capturedAt: string;
};

/** Sidecar key: same R2 stem as the photo key, with a .json extension. */
export function photoSidecarKey(photoKey: string): string {
  return photoKey.replace(/\.[A-Za-z0-9]+$/, '.json');
}

export function buildPhotoSidecar(args: {
  photoId: string;
  sessionId: string;
  sessionReference: string | null;
  formulationId: string | null;
  angle: string;
  photoKey: string;
  capturedAt: Date;
}): PhotoSidecar {
  return {
    version: 1,
    photoId: args.photoId,
    sessionId: args.sessionId,
    sessionReference: args.sessionReference,
    formulationId: args.formulationId,
    angle: args.angle,
    photoKey: args.photoKey,
    capturedAt: args.capturedAt.toISOString(),
  };
}
