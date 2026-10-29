/**
 * Result-screen → capture handoff (Phase 1 item 6).
 *
 * The wizard's Results step routes to /capture carrying the current
 * session + formulation references as URL parameters:
 *
 *   /capture?sessionId=<formulation_sessions.id>&formulaId=<formulations.id>
 *
 * Both ids are UUIDs (formulation_sessions.id and formulations.id are
 * gen_random_uuid()). Client capture uids (`${Date.now()}-${random}`) are
 * NOT UUIDs, so a UUID-shape check cleanly separates a real handoff
 * reference from any internal id — and anything that fails the check is
 * dropped, never forwarded, never invented.
 *
 * Validation here is shape-only. Existence is enforced server-side by
 * POST /api/capture/result-photo (404 on an unknown session/formulation).
 *
 * MERGE-TIME JOIN (item 5): capture forwards `formulaId` in the
 * /api/photos/upload JSON body. On main the upload route ignores that
 * unknown field (it destructures only sessionId/angle/contentType/
 * contentLength); after the item-5 branch merges, the same field is
 * recorded as the photo→formula pairing at capture. This file does not
 * depend on item 5 — the handoff works on main, the pairing activates
 * on merge.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` is a UUID-shaped string (leading/trailing space ignored). */
export function isValidHandoffId(
  value: string | null | undefined
): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export interface HandoffParams {
  sessionId: string | null;
  formulationId: string | null;
  /** True when at least one validated reference is present. */
  active: boolean;
}

/** Validate raw URL/body values into handoff params; invalid values become null. */
export function parseHandoffParams(raw: {
  sessionId?: string | null;
  formulationId?: string | null;
}): HandoffParams {
  const sessionId = isValidHandoffId(raw.sessionId)
    ? (raw.sessionId as string).trim()
    : null;
  const formulationId = isValidHandoffId(raw.formulationId)
    ? (raw.formulationId as string).trim()
    : null;
  return {
    sessionId,
    formulationId,
    active: sessionId !== null || formulationId !== null,
  };
}

/** A handoff is active when at least one validated reference is present. */
export function handoffIsActive(params: HandoffParams): boolean {
  return params.active;
}

/**
 * Build the capture URL for a Results-step handoff. Invalid or missing ids
 * are dropped; with neither id present this is plain /capture (the
 * pre-existing no-parameter behavior).
 */
export function buildResultHandoffUrl(
  sessionId: string | null | undefined,
  formulationId: string | null | undefined
): string {
  const params = new URLSearchParams();
  if (isValidHandoffId(sessionId)) {
    params.set('sessionId', (sessionId as string).trim());
  }
  if (isValidHandoffId(formulationId)) {
    params.set('formulaId', (formulationId as string).trim());
  }
  const query = params.toString();
  return query ? `/capture?${query}` : '/capture';
}
