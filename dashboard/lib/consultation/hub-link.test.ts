/**
 * lib/consultation/hub-link.ts — validateHubToken.
 *
 * The form door and the guest-chat door render ONLY on ok:true; anything
 * else gets the invalid-link page. The dangerous case is a deleted
 * stylist's still-scheduled appointment: the account-deletion detach sets
 * its stylistId to NULL, and Prisma throws on findUnique with a null id.
 * The door must return not-ok, never throw. No live database here: the
 * fake prisma throws on a null stylist lookup exactly like real Prisma.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Bare jest.fn() infers never-typed mockResolvedValue params under this
// tsconfig (the conditional resolved-value type collapses to never), so
// cast the mocks to an explicit async function type.
type AsyncMock = jest.MockedFunction<(...args: any[]) => Promise<any>>;
const mockTokens = jest.fn() as AsyncMock;
const mockAppointments = jest.fn() as AsyncMock;
const mockClients = jest.fn() as AsyncMock;
const mockStylists = jest.fn() as AsyncMock;

jest.mock('@/lib/prisma', () => ({
  prisma: {
    client_report_tokens: { findUnique: (...a: any[]) => (mockTokens as any)(...a) },
    consultation_appointments: { findUnique: (...a: any[]) => (mockAppointments as any)(...a) },
    clients: { findUnique: (...a: any[]) => (mockClients as any)(...a) },
    stylists: { findUnique: (...a: any[]) => (mockStylists as any)(...a) },
  },
}));

import { validateHubToken } from './hub-link';
import { hashToken } from './client-report-tokens';

const FUTURE = new Date('2027-01-01T00:00:00.000Z');
const PAST = new Date('2020-01-01T00:00:00.000Z');
const SCHEDULED_AT = new Date('2026-11-12T11:00:00.000Z');

function tokenRow(over: Record<string, unknown> = {}) {
  return {
    tokenHash: hashToken('tok-1'),
    revokedAt: null,
    expiresAt: FUTURE,
    appointmentId: 'appt-1',
    ...over,
  };
}

function apptRow(over: Record<string, unknown> = {}) {
  return {
    id: 'appt-1',
    status: 'scheduled',
    clientId: 'c-1',
    stylistId: 's-1',
    scheduledAt: SCHEDULED_AT,
    ...over,
  };
}

beforeEach(() => {
  mockTokens.mockReset();
  mockAppointments.mockReset();
  mockClients.mockReset();
  mockStylists.mockReset();
  mockTokens.mockResolvedValue(tokenRow());
  mockAppointments.mockResolvedValue(apptRow());
  mockClients.mockResolvedValue({ first_name: 'Jason' });
  // Real Prisma throws a validation error on findUnique with a null id.
  mockStylists.mockImplementation(async (args: any) => {
    if (args.where.id == null) throw new Error('Prisma validation: id must not be null');
    return { first_name: 'Tiche', display_name: null };
  });
});

describe('validateHubToken', () => {
  it('valid token + scheduled appointment: ok with names', async () => {
    expect(await validateHubToken('tok-1')).toEqual({
      ok: true,
      appointmentId: 'appt-1',
      clientName: 'Jason',
      stylistName: 'Tiche',
      scheduledAt: '2026-11-12T11:00:00.000Z',
    });
  });

  it('NULL stylistId (deleted stylist, detached appointment): not-ok, never throws', async () => {
    mockAppointments.mockResolvedValue(apptRow({ stylistId: null }));
    expect(await validateHubToken('tok-1')).toEqual({ ok: false });
    // The guard runs before the lookup — the throwing lookup is never reached.
    expect(mockStylists).not.toHaveBeenCalled();
  });

  it('missing stylist row (id set, row gone): ok with the generic fallback', async () => {
    mockStylists.mockResolvedValue(null);
    expect(await validateHubToken('tok-1')).toMatchObject({ ok: true, stylistName: 'your stylist' });
  });

  it('revoked token: not-ok', async () => {
    mockTokens.mockResolvedValue(tokenRow({ revokedAt: new Date('2026-11-11T00:00:00.000Z') }));
    expect(await validateHubToken('tok-1')).toEqual({ ok: false });
  });

  it('expired token: not-ok', async () => {
    mockTokens.mockResolvedValue(tokenRow({ expiresAt: PAST }));
    expect(await validateHubToken('tok-1')).toEqual({ ok: false });
  });

  it('unknown token: not-ok', async () => {
    mockTokens.mockResolvedValue(null);
    expect(await validateHubToken('tok-1')).toEqual({ ok: false });
  });

  it('appointment not scheduled: not-ok', async () => {
    mockAppointments.mockResolvedValue(apptRow({ status: 'completed' }));
    expect(await validateHubToken('tok-1')).toEqual({ ok: false });
  });
});
