/**
 * Appointment-scoped tokens for the pre-appointment doors (Phase 1 item 7).
 *
 * One token is scoped to exactly one appointment (and, through it, one
 * stylist). The raw token is returned ONCE to the stylist at issuance and is
 * never stored; only its SHA-256 hash is stored. A token grants exactly one
 * power: submitting PENDING client-reported data to that one appointment.
 * It grants no reads, no dashboard, no formulation, no marketplace, and no
 * confirmation — confirmation is stylist-auth only.
 *
 * Values (design §3, adopted as item 7's stated values):
 *   - Expiry: appointment scheduled time + 2-hour grace.
 *   - Rate limit: 10 submissions per hour per token. On a 429, stop — never
 *     pace, retry around, or route around a throttle (standing rule).
 * All enforcement here is pure functions over plain records so the harness
 * can exercise every refusal branch without a database.
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const TOKEN_BYTES = 32;
/** Design value: appointment time + 2-hour grace. */
export const TOKEN_GRACE_MS = 2 * 60 * 60 * 1000;
/** Design value: 10 submissions per hour per token. */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX = 10;

/** 32 random bytes, base64url — high-entropy, URL-safe for the magic link. */
export function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** SHA-256 hex. Only this is stored; the raw token is never persisted. */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

/** Appointment scheduled time + grace = token expiry. */
export function tokenExpiryFor(scheduledAt: Date): Date {
  return new Date(scheduledAt.getTime() + TOKEN_GRACE_MS);
}

/** Plain-object mirror of the client_report_tokens row (subset used here). */
export interface TokenRecord {
  tokenHash: string;
  appointmentId: string;
  stylistId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  submissionWindowStart: Date | null;
  submissionCount: number;
}

export type TokenValidation =
  | { ok: true; record: TokenRecord }
  | { ok: false; reason: 'not_found' | 'token_mismatch' | 'revoked' | 'expired' | 'appointment_mismatch' };

/**
 * Validate a presented token against its stored record and the appointment
 * in the request path. Fail-closed: every mismatch is a refusal. The stylist
 * scope rides the appointment (a token is issued for one appointment, and an
 * appointment belongs to one stylist), so no separate stylist check is needed
 * — an appointment mismatch already refuses a token used against the wrong
 * appointment or stylist.
 */
export function validateTokenRecord(
  record: TokenRecord | null,
  opts: { rawToken: string; appointmentId: string; now: Date },
): TokenValidation {
  if (!record) return { ok: false, reason: 'not_found' };
  const presentedHash = hashToken(opts.rawToken);
  const a = Buffer.from(presentedHash, 'utf8');
  const b = Buffer.from(record.tokenHash, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'token_mismatch' };
  }
  if (record.revokedAt) return { ok: false, reason: 'revoked' };
  if (opts.now.getTime() > record.expiresAt.getTime()) {
    return { ok: false, reason: 'expired' };
  }
  if (record.appointmentId !== opts.appointmentId) {
    return { ok: false, reason: 'appointment_mismatch' };
  }
  return { ok: true, record };
}

export interface RateLimitResult {
  allowed: boolean;
  /** Window start to persist after this attempt. */
  nextWindowStart: Date;
  /** Count to persist after this attempt. */
  nextCount: number;
}

/**
 * Fixed-window rate limit, counted per token. Attempts inside an unexpired
 * window increment the count; an expired window resets to a fresh window.
 * The caller persists nextWindowStart/nextCount on every token-validated
 * attempt (including attempts that later fail field validation), so junk
 * submissions cannot evade the limit by retrying with fixed fields.
 */
export function rateLimitCheck(
  windowStart: Date | null,
  count: number,
  now: Date,
): RateLimitResult {
  if (!windowStart || now.getTime() - windowStart.getTime() >= RATE_LIMIT_WINDOW_MS) {
    return { allowed: true, nextWindowStart: now, nextCount: 1 };
  }
  if (count >= RATE_LIMIT_MAX) {
    return { allowed: false, nextWindowStart: windowStart, nextCount: count };
  }
  return { allowed: true, nextWindowStart: windowStart, nextCount: count + 1 };
}
