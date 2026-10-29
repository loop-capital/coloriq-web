/**
 * GAP-1 consent set — unit tests (Phase 1 item 4).
 * Pure decision rules only; no database. Wording versions used here are
 * TEST-ONLY labels (NOT CLEARED) — they prove the gate logic by injection
 * into the cleared-set parameter, never by claiming clearance. The
 * production cleared set is asserted empty in its own test.
 */
import { describe, it, expect } from '@jest/globals';
import {
  validateSplitConsent,
  isFeaturingConsentOnFile,
  applyRevocation,
  stripConsentRecordForReader,
  toBlindRevokeResponse,
  CLEARED_FEATURING_WORDING_VERSIONS,
  type FeaturingRecordLike,
} from '../../consent';

// TEST-ONLY wording version label. NOT CLEARED. It must never satisfy the
// production (default) push-time check; it satisfies the check only when
// a test explicitly injects it as cleared.
const TEST_VERSION = 'TEST-ONLY-VERSION-1';

function featuringRecord(overrides: Partial<FeaturingRecordLike> = {}): FeaturingRecordLike {
  return {
    kind: 'featuring',
    method: 'digital',
    attested_at: '2026-10-28T12:00:00.000Z',
    wording_version: TEST_VERSION,
    revoked_at: null,
    created_at: '2026-10-28T12:00:00.000Z',
    ...overrides,
  };
}

function serviceRecord(overrides: Partial<FeaturingRecordLike> = {}): FeaturingRecordLike {
  return {
    kind: 'service',
    method: 'verbal',
    attested_at: '2026-10-28T12:00:00.000Z',
    wording_version: null,
    revoked_at: null,
    created_at: '2026-10-28T12:00:00.000Z',
    ...overrides,
  };
}

describe('split capture (criterion 1)', () => {
  it('service and featuring validate as separate records with separate kinds', () => {
    const a = validateSplitConsent(
      { appointment_id: 'appt-1', kind: 'service', method: 'verbal' },
      { source: 'client_direct', actorId: 'client-1' }
    );
    const b = validateSplitConsent(
      {
        appointment_id: 'appt-1',
        kind: 'featuring',
        method: 'digital',
        wording_version: TEST_VERSION,
      },
      { source: 'client_direct', actorId: 'client-1' }
    );
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.consent.kind).toBe('service');
      expect(b.consent.kind).toBe('featuring');
      expect(a.consent).not.toEqual(b.consent);
    }
  });

  it('service consent never satisfies the featuring check', () => {
    expect(isFeaturingConsentOnFile([serviceRecord()])).toEqual({
      allowed: false,
      reason: 'ABSENT',
    });
  });

  it('service normalization forces wording_version null even if supplied', () => {
    const r = validateSplitConsent(
      { appointment_id: 'appt-1', kind: 'service', method: 'signed', wording_version: TEST_VERSION },
      { source: 'stylist_attested', actorId: 'stylist-1' }
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.consent.wording_version).toBeNull();
  });

  it('featuring defaults off: no records means refused', () => {
    expect(isFeaturingConsentOnFile([])).toEqual({ allowed: false, reason: 'ABSENT' });
  });
});

describe('client-direct vs stylist-attested capture (criterion 2)', () => {
  it('source is recorded from the caller, and attested_by derives from the actor', () => {
    const r = validateSplitConsent(
      {
        appointment_id: 'appt-1',
        kind: 'featuring',
        method: 'digital',
        attested_by: 'someone-else',
        wording_version: TEST_VERSION,
      },
      { source: 'client_direct', actorId: 'client-9' }
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.consent.source).toBe('client_direct');
      // Body-supplied attested_by is ignored; the actor id wins.
      expect(r.consent.attested_by).toBe('client-9');
    }
  });

  it('validation mirrors validateConsent: method enum + ISO attested_at', () => {
    expect(
      validateSplitConsent(
        { appointment_id: 'appt-1', kind: 'featuring', method: 'carrier-pigeon' },
        { source: 'client_direct', actorId: 'client-1' }
      ).ok
    ).toBe(false);
    expect(
      validateSplitConsent(
        { appointment_id: 'appt-1', kind: 'featuring', method: 'digital', attested_at: 'not-a-date' },
        { source: 'client_direct', actorId: 'client-1' }
      ).ok
    ).toBe(false);
    expect(
      validateSplitConsent(
        { appointment_id: 'appt-1', kind: 'wrong-kind', method: 'digital' },
        { source: 'client_direct', actorId: 'client-1' }
      ).ok
    ).toBe(false);
    expect(
      validateSplitConsent(
        { kind: 'featuring', method: 'digital' },
        { source: 'client_direct', actorId: 'client-1' }
      ).ok
    ).toBe(false);
  });

  it('source never bypasses the wording gate', () => {
    const record = featuringRecord();
    expect(isFeaturingConsentOnFile([record])).toEqual({
      allowed: false,
      reason: 'WORDING_NOT_CLEARED',
    });
  });
});

describe('wording gate, fail closed (criterion 4)', () => {
  it('the production cleared set is empty', () => {
    expect(CLEARED_FEATURING_WORDING_VERSIONS).toEqual([]);
  });

  it('featuring without a wording version refuses', () => {
    expect(isFeaturingConsentOnFile([featuringRecord({ wording_version: null })])).toEqual({
      allowed: false,
      reason: 'WORDING_NOT_CLEARED',
    });
  });

  it('a TEST-ONLY version refuses under the default (production) cleared set', () => {
    expect(isFeaturingConsentOnFile([featuringRecord()])).toEqual({
      allowed: false,
      reason: 'WORDING_NOT_CLEARED',
    });
  });

  it('the same record allows only when its version is injected as cleared', () => {
    expect(isFeaturingConsentOnFile([featuringRecord()], [TEST_VERSION])).toEqual({
      allowed: true,
      reason: 'ON_FILE',
    });
  });

  it('malformed featuring records refuse as INVALID', () => {
    expect(isFeaturingConsentOnFile([featuringRecord({ method: 'shrug' })], [TEST_VERSION])).toEqual({
      allowed: false,
      reason: 'INVALID',
    });
  });
});

describe('revocation: per-appointment, immediate, blind (criterion 3)', () => {
  it('a revoked latest record refuses even when an older grant existed', () => {
    const records = [
      featuringRecord({ created_at: '2026-10-28T10:00:00.000Z' }),
      featuringRecord({ created_at: '2026-10-28T11:00:00.000Z', revoked_at: '2026-10-28T11:30:00.000Z' }),
    ];
    expect(isFeaturingConsentOnFile(records, [TEST_VERSION])).toEqual({
      allowed: false,
      reason: 'REVOKED',
    });
  });

  it('re-capture after revocation is a fresh grant (latest wins)', () => {
    const records = [
      featuringRecord({ created_at: '2026-10-28T10:00:00.000Z', revoked_at: '2026-10-28T10:30:00.000Z' }),
      featuringRecord({ created_at: '2026-10-28T11:00:00.000Z' }),
    ];
    expect(isFeaturingConsentOnFile(records, [TEST_VERSION])).toEqual({
      allowed: true,
      reason: 'ON_FILE',
    });
  });

  it('applyRevocation is idempotent: first revocation wins', () => {
    const record = {
      revoked_at: null as string | null,
      revoked_by: null as string | null,
    };
    const once = applyRevocation(record, 'client-1');
    expect(once.revoked_at).not.toBeNull();
    expect(once.revoked_by).toBe('client-1');
    const twice = applyRevocation(once, 'client-2');
    expect(twice.revoked_at).toBe(once.revoked_at);
    expect(twice.revoked_by).toBe('client-1');
  });

  it('blind state: non-owners see nothing, owners see the record', () => {
    const record = featuringRecord();
    expect(stripConsentRecordForReader(record, false)).toBeNull();
    expect(stripConsentRecordForReader(record, true)).toBe(record);
  });

  it('blind revoke response carries only id, kind, revoked', () => {
    const res = toBlindRevokeResponse({ id: 'rec-1', kind: 'featuring' });
    expect(res).toEqual({ id: 'rec-1', kind: 'featuring', revoked: true });
    expect(Object.keys(res).sort()).toEqual(['id', 'kind', 'revoked']);
  });
});
