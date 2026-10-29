/**
 * GAP-1 consent set — Phase 1 item 4.
 *
 * Split consent model: (a) service consent and (b) featuring consent are
 * SEPARATE records, never merged. Service covers photos for the
 * consultation/service for one appointment; featuring is OPTIONAL and
 * defaults off, covering only this appointment's photos on GetUpLook.com
 * and the salon's / COLORiq's Instagram — never sponsors or third parties.
 *
 * Wording gate (binding): the exact (b) featuring-consent wording is
 * Gideon's clearance, not this module's. CLEARED_FEATURING_WORDING_VERSIONS
 * lists the version ids Gideon has cleared; it is EMPTY until clearance
 * lands, so the push-time check fails closed for every featuring record
 * until then. Records may be captured against a wording version id, but a
 * version id counts only once it appears in the cleared list. Draft wording
 * (including any draft in the Oct 25 design note, marked NOT CLEARED) has
 * no version id and can never satisfy the check.
 *
 * This module is pure logic (no prisma import) so the decision rules are
 * unit-testable without a database. DB access lives in consent-store.ts.
 * Appointment scope is an opaque string key: the repo has no appointments
 * table, so appointment_id is validated as non-empty only and is never
 * treated as a foreign key.
 */

export const CONSENT_KINDS = ['service', 'featuring'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

export const CONSENT_SOURCES = ['client_direct', 'stylist_attested'] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

// Mirrors CONSENT_METHODS in lib/transformations.ts (kept local so this
// module stays importable by tests without pulling the R2 client).
export const CONSENT_METHODS = ['verbal', 'signed', 'digital'] as const;
export type ConsentMethod = (typeof CONSENT_METHODS)[number];

/**
 * Version ids of (b) featuring wording that Gideon has cleared.
 * EMPTY until clearance lands — that emptiness is the fail-closed gate.
 * Populate ONLY with ids from a Gideon clearance filing, never from draft
 * wording and never from a test label.
 */
export const CLEARED_FEATURING_WORDING_VERSIONS: string[] = [];

export interface SplitConsentInput {
  appointment_id?: unknown;
  kind?: unknown;
  method?: unknown;
  attested_at?: unknown;
  wording_version?: unknown;
  note?: unknown;
}

export interface NormalizedConsent {
  appointment_id: string;
  kind: ConsentKind;
  source: ConsentSource;
  method: ConsentMethod;
  attested_by: string;
  attested_at: string; // normalized ISO8601
  wording_version: string | null; // featuring only; service always null
  note: string | null;
}

export type ValidateSplitResult =
  | { ok: true; consent: NormalizedConsent }
  | { ok: false; error: string };

/**
 * Validate + normalize one split consent capture. Mirrors validateConsent's
 * discipline (method enum, ISO attested_at) and adds the split: kind must
 * be service|featuring, and source is supplied by the caller (the route
 * derives it from auth — never from the request body — so a stylist cannot
 * launder attestation as client-direct). attested_by is likewise derived
 * from the authenticated actor, never from the body.
 */
export function validateSplitConsent(
  input: any,
  opts: { source: ConsentSource; actorId: string }
): ValidateSplitResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'consent is required' };
  }
  const appointmentId = input.appointment_id;
  if (typeof appointmentId !== 'string' || !appointmentId.trim()) {
    return { ok: false, error: 'consent.appointment_id must be a non-empty string' };
  }
  if (!CONSENT_KINDS.includes(input.kind)) {
    return { ok: false, error: 'consent.kind must be one of: ' + CONSENT_KINDS.join(', ') };
  }
  if (!CONSENT_METHODS.includes(input.method)) {
    return { ok: false, error: 'consent.method must be one of: ' + CONSENT_METHODS.join(', ') };
  }
  const attestedAt = input.attested_at || new Date().toISOString();
  if (typeof attestedAt !== 'string' || Number.isNaN(Date.parse(attestedAt))) {
    return { ok: false, error: 'consent.attested_at must be an ISO8601 timestamp' };
  }
  // Wording versions apply to featuring only. Service consent carries none.
  const wordingVersion =
    input.kind === 'featuring' &&
    typeof input.wording_version === 'string' &&
    input.wording_version.trim()
      ? input.wording_version.trim()
      : null;
  return {
    ok: true,
    consent: {
      appointment_id: appointmentId.trim(),
      kind: input.kind,
      source: opts.source,
      method: input.method,
      attested_by: opts.actorId,
      attested_at: new Date(attestedAt).toISOString(),
      wording_version: wordingVersion,
      note: typeof input.note === 'string' && input.note ? input.note : null,
    },
  };
}

/** Minimal record shape the push-time check needs (DB rows satisfy this). */
export interface FeaturingRecordLike {
  kind: string;
  method: string;
  attested_at: string | Date;
  wording_version: string | null;
  revoked_at: string | Date | null;
  created_at: string | Date;
}

export type ConsentCheckReason =
  | 'ON_FILE'
  | 'ABSENT'
  | 'REVOKED'
  | 'INVALID'
  | 'WORDING_NOT_CLEARED';

export interface ConsentCheckResult {
  allowed: boolean;
  reason: ConsentCheckReason;
}

function toTime(v: string | Date): number {
  return v instanceof Date ? v.getTime() : Date.parse(v);
}

/**
 * Push-time (b)-on-file check — the gate publication/featuring flows call
 * before pushing a post. Fail closed on every path: missing, revoked,
 * malformed, or uncleared-wording featuring consent is a refusal.
 *
 * Rules, in order:
 * 1. Only kind === 'featuring' records count. Service records never
 *    satisfy featuring, and setting service never sets featuring.
 * 2. The LATEST featuring record for the appointment wins (a later
 *    re-capture after revocation is a fresh grant).
 * 3. A revoked latest record refuses, even if an older grant existed.
 * 4. Malformed method/attested_at refuses.
 * 5. wording_version must be present AND in the cleared set. The default
 *    cleared set is empty (no Gideon clearance yet), so the check refuses
 *    every featuring record until clearance lands. Callers may inject a
 *    cleared set (tests do); production callers must not.
 */
export function isFeaturingConsentOnFile(
  records: FeaturingRecordLike[],
  clearedVersions: string[] = CLEARED_FEATURING_WORDING_VERSIONS
): ConsentCheckResult {
  const featuring = records.filter((r) => r.kind === 'featuring');
  if (featuring.length === 0) {
    return { allowed: false, reason: 'ABSENT' };
  }
  let latest = featuring[0];
  for (const r of featuring.slice(1)) {
    if (toTime(r.created_at) >= toTime(latest.created_at)) latest = r;
  }
  if (latest.revoked_at) {
    return { allowed: false, reason: 'REVOKED' };
  }
  if (
    !CONSENT_METHODS.includes(latest.method as ConsentMethod) ||
    Number.isNaN(toTime(latest.attested_at))
  ) {
    return { allowed: false, reason: 'INVALID' };
  }
  if (!latest.wording_version || !clearedVersions.includes(latest.wording_version)) {
    return { allowed: false, reason: 'WORDING_NOT_CLEARED' };
  }
  return { allowed: true, reason: 'ON_FILE' };
}

/**
 * Revoke a consent record. Immediate effect: the returned record carries
 * revoked_at, and the push-time check refuses it from that moment.
 * Idempotent: revoking an already-revoked record keeps the original
 * revoked_at/revoked_by (first revocation wins).
 */
export function applyRevocation<
  T extends { revoked_at: string | Date | null; revoked_by: string | null },
>(record: T, revokedBy: string): T {
  if (record.revoked_at) return record;
  const now = new Date().toISOString();
  return { ...record, revoked_at: now, revoked_by: revokedBy };
}

/**
 * Blind-state shaping for readers: non-owners learn nothing — not even
 * whether a record exists. Owners see the record. Routes return 404 (not
 * a stripped body) for unauthorized readers; this helper shapes the
 * owner/non-owner branch where a body is returned at all.
 */
export function stripConsentRecordForReader<T>(record: T, isOwner: boolean): T | null {
  return isOwner ? record : null;
}

/**
 * Blind-state revoke response: carries only the record id, its kind, and
 * the revoked flag — never appointment/client/stylist details or
 * timestamps. The caller already knows the id and kind; the response
 * confirms effect and nothing else.
 */
export function toBlindRevokeResponse(record: { id: string; kind: string }): {
  id: string;
  kind: string;
  revoked: true;
} {
  return { id: record.id, kind: record.kind, revoked: true };
}
