/**
 * Harness for Phase 1 item 7 (pre-appointment doors), part d contract +
 * token/rate-limit enforcement. Pure-function coverage: no database is
 * needed, so every refusal branch is exercised. Route handlers are thin
 * wrappers over these functions (see the route headers); route wiring is
 * verified by tsc, and live-route behavior needs a database, which this
 * environment does not provide (stated, not assumed).
 */

import { describe, expect, it } from '@jest/globals';
import {
  CLIENT_REPORTABLE_FIELDS,
  PINNED_CONTRACT,
  PINNED_MAP,
  applyMerge,
  detectConflicts,
  validateClientReportFields,
  validateConsents,
  validateMergeFields,
} from '../client-report-contract';
import { FIELD_KEYS } from '../field-mapping';
import {
  RATE_LIMIT_MAX,
  generateRawToken,
  hashToken,
  rateLimitCheck,
  validateTokenRecord,
  type TokenRecord,
} from '../client-report-tokens';

function makeRecord(overrides: Partial<TokenRecord> = {}): TokenRecord {
  return {
    tokenHash: hashToken('raw-token'),
    appointmentId: 'appt-1',
    stylistId: 'sty-1',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    revokedAt: null,
    submissionWindowStart: null,
    submissionCount: 0,
    ...overrides,
  };
}

describe('pinned contract shape (28-vs-26 reconciliation)', () => {
  it('pins 36 keys: 28 dictate + 8 client-added, no drops, no merges', () => {
    expect(PINNED_CONTRACT).toHaveLength(36);
    expect(PINNED_CONTRACT.filter((d) => d.source === 'dictate')).toHaveLength(28);
    expect(PINNED_CONTRACT.filter((d) => d.source === 'client-added')).toHaveLength(8);
    // Every dictate key appears exactly once.
    const dictateKeys = PINNED_CONTRACT.filter((d) => d.source === 'dictate').map((d) => d.key);
    expect(new Set(dictateKeys).size).toBe(28);
    expect([...dictateKeys].sort()).toEqual([...FIELD_KEYS].sort());
  });

  it('classifies 21 client-reportable and 15 photo-observed keys', () => {
    expect(PINNED_CONTRACT.filter((d) => d.reportableBy === 'client')).toHaveLength(21);
    expect(PINNED_CONTRACT.filter((d) => d.reportableBy === 'photo')).toHaveLength(15);
    expect(PINNED_MAP.get('condition.grayPercent')?.reportableBy).toBe('photo');
    expect(PINNED_MAP.get('greyCoverageNeed')?.reportableBy).toBe('client');
    expect(PINNED_MAP.get('condition.previousLightener')?.reportableBy).toBe('client');
  });

  it('orders client-reportable fields by design group (history before target)', () => {
    const keys = CLIENT_REPORTABLE_FIELDS.map((d) => d.key);
    expect(keys).toHaveLength(21);
    const idx = (k: string) => keys.indexOf(k);
    expect(idx('chemicalHistory')).toBeLessThan(idx('sensitivities'));
    expect(idx('sensitivities')).toBeLessThan(idx('targetLevel'));
    expect(idx('targetLevel')).toBeLessThan(idx('greyCoverageNeed'));
    expect(idx('greyCoverageNeed')).toBeLessThan(idx('conditionNotes'));
    expect(idx('wantsAvoid')).toBeLessThan(idx('inspirationNotes'));
    expect(idx('serviceType')).toBeLessThan(idx('hairType'));
    expect(idx('hairType')).toBeLessThan(idx('brandPreference'));
  });
});

describe('validateClientReportFields (fail-closed)', () => {
  const valid = {
    targetLevel: 8,
    targetTone: 'A',
    serviceType: 'balayage',
    chemicalHistory: ['box_dye'],
    sensitivities: ['ppd_allergy'],
    lastChemicalService: '3_to_6_months',
    greyCoverageNeed: 'full',
    targetDescription: 'ashy blonde, no warmth',
    allergyDetails: 'itchy scalp with PPD dye',
  };

  it('accepts a valid client payload and normalizes values', () => {
    const res = validateClientReportFields(valid);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.normalized.targetLevel).toBe(8);
      expect(res.normalized.targetTone).toBe('A');
      expect(res.normalized.chemicalHistory).toEqual(['box_dye']);
      expect(res.normalized.greyCoverageNeed).toBe('full');
    }
  });

  it('normalizes a tone word to its letter code', () => {
    const res = validateClientReportFields({ targetTone: 'ash' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.normalized.targetTone).toBe('A');
  });

  it('refuses a photo-observed key (never silently dropped)', () => {
    const res = validateClientReportFields({ ...valid, currentLevel: 6 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.join(' ')).toMatch(/not client-reportable: currentLevel/);
    }
  });

  it('refuses unknown keys and unusable values', () => {
    const unknown = validateClientReportFields({ ...valid, paymentCard: '4111' });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.errors.join(' ')).toMatch(/unknown field: paymentCard/);

    const badEnum = validateClientReportFields({ serviceType: 'rainbow' });
    expect(badEnum.ok).toBe(false);

    const badLevel = validateClientReportFields({ targetLevel: 42 });
    expect(badLevel.ok).toBe(false);

    const empty = validateClientReportFields({ targetDescription: '   ' });
    expect(empty.ok).toBe(false);

    const notObject = validateClientReportFields('nope');
    expect(notObject.ok).toBe(false);
  });

  it('preserves an explicit empty list as "none reported" (distinct from unknown)', () => {
    const res = validateClientReportFields({ chemicalHistory: [] });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.normalized.chemicalHistory).toEqual([]);
  });
});

describe('validateConsents (split shape, values only)', () => {
  it('defaults featuring to false when omitted', () => {
    const res = validateConsents({ service_consent: true });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.values.serviceConsent).toBe(true);
      expect(res.values.featuringConsent).toBe(false);
    }
  });

  it('preserves an explicit featuring opt-in separately from service consent', () => {
    const res = validateConsents({ service_consent: false, featuring_consent: true });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.values.serviceConsent).toBe(false);
      expect(res.values.featuringConsent).toBe(true);
    }
  });

  it('refuses a missing or non-boolean service consent', () => {
    expect(validateConsents({}).ok).toBe(false);
    expect(validateConsents({ service_consent: 'yes' }).ok).toBe(false);
    expect(validateConsents({ service_consent: true, featuring_consent: 'yes' }).ok).toBe(false);
  });
});

describe('appointment tokens', () => {
  it('generates distinct high-entropy tokens with stable hashes', () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a.length).toBeGreaterThan(20);
    expect(a).not.toBe(b);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(hashToken(b));
  });

  it('accepts a valid token for its appointment', () => {
    const res = validateTokenRecord(makeRecord(), {
      rawToken: 'raw-token',
      appointmentId: 'appt-1',
      now: new Date(),
    });
    expect(res.ok).toBe(true);
  });

  it('refuses every mismatch branch', () => {
    const now = new Date();
    expect(
      validateTokenRecord(null, { rawToken: 'x', appointmentId: 'appt-1', now }).ok,
    ).toBe(false);
    const wrongRaw = validateTokenRecord(makeRecord(), { rawToken: 'other', appointmentId: 'appt-1', now });
    expect(wrongRaw.ok).toBe(false);
    if (!wrongRaw.ok) expect(wrongRaw.reason).toBe('token_mismatch');
    const wrongAppt = validateTokenRecord(makeRecord(), { rawToken: 'raw-token', appointmentId: 'appt-2', now });
    expect(wrongAppt.ok).toBe(false);
    if (!wrongAppt.ok) expect(wrongAppt.reason).toBe('appointment_mismatch');
    const revoked = validateTokenRecord(makeRecord({ revokedAt: new Date() }), { rawToken: 'raw-token', appointmentId: 'appt-1', now });
    expect(revoked.ok).toBe(false);
    if (!revoked.ok) expect(revoked.reason).toBe('revoked');
    const expired = validateTokenRecord(makeRecord({ expiresAt: new Date(Date.now() - 1000) }), { rawToken: 'raw-token', appointmentId: 'appt-1', now });
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.reason).toBe('expired');
  });
});

describe('rate limit (10/hour/token)', () => {
  it('starts a fresh window on first attempt', () => {
    const now = new Date();
    const res = rateLimitCheck(null, 0, now);
    expect(res.allowed).toBe(true);
    expect(res.nextCount).toBe(1);
    expect(res.nextWindowStart).toEqual(now);
  });

  it('allows up to the max, then refuses', () => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 1000);
    expect(rateLimitCheck(windowStart, RATE_LIMIT_MAX - 1, now).allowed).toBe(true);
    const denied = rateLimitCheck(windowStart, RATE_LIMIT_MAX, now);
    expect(denied.allowed).toBe(false);
    expect(denied.nextCount).toBe(RATE_LIMIT_MAX);
  });

  it('resets after the window expires', () => {
    const now = new Date();
    const oldWindow = new Date(now.getTime() - 61 * 60 * 1000);
    const res = rateLimitCheck(oldWindow, RATE_LIMIT_MAX, now);
    expect(res.allowed).toBe(true);
    expect(res.nextCount).toBe(1);
  });
});

describe('conflicts and merge', () => {
  it('surfaces only keys present on both sides with different values', () => {
    const conflicts = detectConflicts(
      { targetLevel: 8, serviceType: 'balayage', wantsAvoid: 'brass' },
      { targetLevel: 7, serviceType: 'balayage' },
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('targetLevel');
    expect(conflicts[0].clientValue).toBe(8);
    expect(conflicts[0].currentValue).toBe(7);
    expect(detectConflicts({ a: 1 }, { a: 1 })).toHaveLength(0);
  });

  it('merges resolved values over current values, preserving the rest', () => {
    expect(applyMerge({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
  });

  it('merge validation accepts observed keys but refuses unknown keys', () => {
    const ok = validateMergeFields({ currentLevel: 6, targetLevel: 8 });
    expect(ok.ok).toBe(true);
    const bad = validateMergeFields({ currentLevel: 6, nope: 1 });
    expect(bad.ok).toBe(false);
  });

  it('records allergy free text verbatim (trim only, no content change)', () => {
    const text = 'Reacts to PPD: itchy, red scalp for two days';
    const res = validateMergeFields({ allergyDetails: `  ${text}  ` });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.normalized.allergyDetails).toBe(text);
  });
});
