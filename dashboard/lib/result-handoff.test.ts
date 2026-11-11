/**
 * Result-screen → capture handoff helpers (Phase 1 item 6) — unit tests.
 * Covers: UUID validation (incl. the client-uid shape, which must fail),
 * param parsing with invalid-value fallback, and handoff URL building.
 */

import { describe, it, expect } from '@jest/globals';
import {
  isValidHandoffId,
  parseHandoffParams,
  handoffIsActive,
  buildResultHandoffUrl,
} from './result-handoff';

const SESSION_ID = '11111111-2222-3333-4444-555555555555';
const FORMULATION_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
// Client capture uid shape (Date.now()-random): must NOT validate.
const CLIENT_UID = '1761771234567-a1b2c3d';

describe('isValidHandoffId', () => {
  it('accepts a lowercase UUID', () => {
    expect(isValidHandoffId(SESSION_ID)).toBe(true);
  });

  it('accepts an uppercase UUID', () => {
    expect(isValidHandoffId(SESSION_ID.toUpperCase())).toBe(true);
  });

  it('rejects the client-uid shape', () => {
    expect(isValidHandoffId(CLIENT_UID)).toBe(false);
  });

  it('rejects garbage, short, and empty values', () => {
    expect(isValidHandoffId('not-a-uuid')).toBe(false);
    expect(isValidHandoffId('11111111-2222-3333')).toBe(false);
    expect(isValidHandoffId('')).toBe(false);
    expect(isValidHandoffId(null)).toBe(false);
    expect(isValidHandoffId(undefined)).toBe(false);
  });
});

describe('parseHandoffParams', () => {
  it('keeps both valid ids', () => {
    expect(
      parseHandoffParams({
        sessionId: SESSION_ID,
        formulationId: FORMULATION_ID,
      })
    ).toEqual({
      sessionId: SESSION_ID,
      formulationId: FORMULATION_ID,
      active: true,
    });
  });

  it('drops an invalid sessionId but keeps a valid formulationId', () => {
    expect(
      parseHandoffParams({
        sessionId: CLIENT_UID,
        formulationId: FORMULATION_ID,
      })
    ).toEqual({
      sessionId: null,
      formulationId: FORMULATION_ID,
      active: true,
    });
  });

  it('returns nulls when nothing valid is present', () => {
    expect(parseHandoffParams({})).toEqual({
      sessionId: null,
      formulationId: null,
      active: false,
    });
    expect(
      parseHandoffParams({ sessionId: 'junk', formulationId: null })
    ).toEqual({
      sessionId: null,
      formulationId: null,
      active: false,
    });
  });
});

describe('handoffIsActive', () => {
  it('is active with either id, inactive with neither', () => {
    expect(
      handoffIsActive({ sessionId: SESSION_ID, formulationId: null, active: true })
    ).toBe(true);
    expect(
      handoffIsActive({ sessionId: null, formulationId: FORMULATION_ID, active: true })
    ).toBe(true);
    expect(
      handoffIsActive({ sessionId: null, formulationId: null, active: false })
    ).toBe(false);
  });
});

describe('buildResultHandoffUrl', () => {
  it('carries both ids as sessionId + formulaId params', () => {
    expect(buildResultHandoffUrl(SESSION_ID, FORMULATION_ID)).toBe(
      `/capture?sessionId=${SESSION_ID}&formulaId=${FORMULATION_ID}`
    );
  });

  it('carries a single id when only one exists', () => {
    expect(buildResultHandoffUrl(SESSION_ID, null)).toBe(
      `/capture?sessionId=${SESSION_ID}`
    );
    expect(buildResultHandoffUrl(null, FORMULATION_ID)).toBe(
      `/capture?formulaId=${FORMULATION_ID}`
    );
  });

  it('falls back to plain /capture with no valid id (never invents one)', () => {
    expect(buildResultHandoffUrl(null, null)).toBe('/capture');
    expect(buildResultHandoffUrl(CLIENT_UID, 'junk')).toBe('/capture');
  });
});
