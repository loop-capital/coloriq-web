/**
 * Account deletion (Apple 5.1.1(v)) — lib/account-deletion.ts and the REAL
 * GET/DELETE handlers in app/api/account/route.ts against a fake prisma.
 *
 * No live database here: the fake records every call so the tests assert
 * exactly which rows are deleted, which are anonymized, which are
 * detached, and which are left alone. FK behavior / transaction rollback
 * is the DB's job and is not simulated beyond "an error inside the
 * transaction rejects the call". The Square client is mocked (no network):
 * cancelSquareSubscriptionIfActive records its calls and can be made to
 * throw. The consultation-history detach runs as typed Prisma updateMany
 * calls (the stylist columns are nullable in the schema); the fake
 * records them like any other model call.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type Call = { model: string; op: string; args: any };
let calls: Call[] = [];
let state: {
  user: any;
  stylist: any;
  subs: any[];
  failOn?: string;
};

function model(name: string) {
  const handler = (op: string) => async (args: any) => {
    calls.push({ model: name, op, args });
    if (state.failOn === `${name}.${op}`) throw new Error(`boom ${name}.${op}`);
    if (name === 'users' && op === 'findUnique') {
      if (!state.user || args.where.id !== state.user.id) return null;
      return { ...state.user, stylist: state.stylist ? { id: state.stylist.id } : null };
    }
    if (name === 'stylists' && op === 'findUnique') return state.stylist;
    if (name === 'subscriptions' && op === 'findFirst') {
      const ors = args.where.OR as Array<{ subscriber_type: string; subscriber_id: string }>;
      const rows = state.subs
        .filter((s) => ors.some((o) => o.subscriber_type === s.subscriber_type && o.subscriber_id === s.subscriber_id))
        .filter((s) => (args.where.status ? s.status === args.where.status : true))
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return rows[0] ?? null;
    }
    if (name === 'subscriptions' && op === 'findMany') {
      const ors = args.where.OR as Array<{ subscriber_type: string; subscriber_id: string }>;
      return state.subs
        .filter((s) => ors.some((o) => o.subscriber_type === s.subscriber_type && o.subscriber_id === s.subscriber_id))
        .filter((s) => !['canceled', 'revoked', 'expired'].includes(s.status))
        .filter((s) => s.square_subscription_id != null)
        .map((s) => ({ square_subscription_id: s.square_subscription_id }));
    }
    if (op === 'deleteMany' || op === 'updateMany') return { count: 1 };
    return {};
  };
  return new Proxy({}, { get: (_t, op: string) => handler(op) });
}

const MODELS = [
  'users', 'stylists', 'subscriptions', 'formulas', 'formula_comments', 'formula_photo_comments',
  'trend_searches', 'webhooks', 'post_likes', 'post_comments', 'community_posts', 'transformations',
  'formula_photos', 'photo_analyses', 'api_keys',
  'consent_records', 'consultation_appointments', 'consultation_records',
  'client_report_tokens', 'client_reports',
];

const mockPrisma: any = Object.fromEntries(MODELS.map((m) => [m, model(m)]));
mockPrisma.$transaction = async (fn: (tx: any) => Promise<any>) => fn(mockPrisma);
// No $executeRaw on the fake on purpose: deleteAccount must not use raw
// SQL — a raw call would throw TypeError here instead of passing silently.

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
const mockGetUserFromRequest = jest.fn(async (_req: any): Promise<any> => null);
const mockClearAuthCookie = jest.fn(async () => {});
jest.mock('@/lib/auth', () => ({
  getUserFromRequest: (...a: any[]) => (mockGetUserFromRequest as any)(...a),
  clearAuthCookie: () => mockClearAuthCookie(),
}));
const mockCancelSquare = jest.fn(async (id: string) => {
  calls.push({ model: 'square', op: 'cancel', args: { subscriptionId: id } });
});
const mockGetSquareSubscription = jest.fn(async (_id: string) => ({ status: 'ACTIVE' }));
jest.mock('@/lib/square', () => ({
  cancelSquareSubscriptionIfActive: (...a: any[]) => (mockCancelSquare as any)(...a),
  getSquareSubscription: (...a: any[]) => (mockGetSquareSubscription as any)(...a),
  isSquareNotFound: (err: any) => err?.statusCode === 404,
}));

import { deleteAccount, getAccountPlanState, planLabel, DELETED_EMAIL_DOMAIN } from './account-deletion';
import { GET, DELETE } from '../app/api/account/route';

const USER = { id: 'u-1', email: 'ana@salon.test', first_name: 'Ana', last_name: 'Ray', salon_id: 'salon-1', created_at: new Date('2026-01-01') };
const STYLIST = { id: 's-1' };

function req(method: string, body?: unknown): any {
  return new Request('http://localhost/api/account', {
    method,
    headers: { 'content-type': 'application/json', authorization: 'Bearer <redacted>' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ops = (m: string, op?: string) => calls.filter((c) => c.model === m && (!op || c.op === op));

beforeEach(() => {
  calls = [];
  state = { user: { ...USER }, stylist: { ...STYLIST }, subs: [] };
  mockGetUserFromRequest.mockReset();
  mockGetUserFromRequest.mockImplementation(async () => null);
  mockClearAuthCookie.mockClear();
  mockCancelSquare.mockClear();
  mockGetSquareSubscription.mockReset();
  mockGetSquareSubscription.mockImplementation(async () => ({ status: 'ACTIVE' }));
});

describe('deleteAccount', () => {
  it('returns null and writes nothing when the user does not exist', async () => {
    state.user = null;
    expect(await deleteAccount('u-1', mockPrisma)).toBeNull();
    expect(calls.filter((c) => c.op !== 'findUnique')).toEqual([]);
  });

  it('deletes the user row last, after all personal content', async () => {
    const res = await deleteAccount('u-1', mockPrisma);
    expect(res).toEqual({ deleted: true, stylistAnonymized: true });
    const last = calls[calls.length - 1];
    expect(last).toMatchObject({ model: 'users', op: 'delete', args: { where: { id: 'u-1' } } });
  });

  it('deletes stylist-owned personal content by stylist id', async () => {
    await deleteAccount('u-1', mockPrisma);
    expect(ops('post_likes', 'deleteMany')[0].args.where).toEqual({ user_id: 's-1' });
    expect(ops('post_comments', 'deleteMany')[0].args.where).toEqual({ author_id: 's-1' });
    expect(ops('community_posts', 'deleteMany')[0].args.where).toEqual({ stylist_id: 's-1' });
    expect(ops('transformations', 'deleteMany')[0].args.where).toEqual({ stylist_id: 's-1' });
    expect(ops('api_keys', 'deleteMany')[0].args.where).toEqual({
      OR: [{ created_by: 's-1' }, { owner_type: 'stylist', owner_id: 's-1' }],
    });
  });

  it('matches soft references on BOTH user id and stylist id', async () => {
    await deleteAccount('u-1', mockPrisma);
    const both = { in: ['u-1', 's-1'] };
    expect(ops('formula_comments', 'deleteMany')[0].args.where).toEqual({ author_id: both });
    expect(ops('formula_photo_comments', 'deleteMany')[0].args.where).toEqual({ author_id: both });
    expect(ops('trend_searches', 'deleteMany')[0].args.where).toEqual({ user_id: both });
    expect(ops('webhooks', 'deleteMany')[0].args.where).toMatchObject({ owner_id: both });
  });

  it('anonymizes (not deletes) the stylist row and scrubs every personal field', async () => {
    await deleteAccount('u-1', mockPrisma);
    expect(ops('stylists', 'delete')).toEqual([]);
    const upd = ops('stylists', 'update')[0].args;
    expect(upd.where).toEqual({ id: 's-1' });
    const d = upd.data;
    expect(d.email).toBe(`deleted-s-1@${DELETED_EMAIL_DOMAIN}`);
    expect(d.email).not.toContain('ana');
    expect(d.first_name).toBe('Deleted');
    expect(d.is_active).toBe(false);
    expect(d.user_id).toBeNull();
    for (const k of ['display_name', 'license_number', 'avatar_url', 'bio', 'instagram_handle',
      'tiktok_handle', 'website_url', 'handle', 'location', 'salon_name']) {
      expect(d[k]).toBeNull();
    }
    expect(d.password_hash.startsWith('$2')).toBe(false); // not a usable bcrypt hash
  });

  it('detaches formulas from the user instead of deleting salon records', async () => {
    await deleteAccount('u-1', mockPrisma);
    expect(ops('formulas', 'deleteMany')).toEqual([]);
    expect(ops('formulas', 'updateMany')[0].args).toEqual({ where: { stylist_id: 'u-1' }, data: { stylist_id: null } });
  });

  it('retains + detaches formula photos and photo analyses instead of deleting them', async () => {
    await deleteAccount('u-1', mockPrisma);
    expect(ops('formula_photos', 'deleteMany')).toEqual([]);
    expect(ops('photo_analyses', 'deleteMany')).toEqual([]);
    expect(ops('formula_photos', 'updateMany')[0].args).toEqual({
      where: { stylist_id: 's-1' }, data: { stylist_id: null },
    });
    expect(ops('photo_analyses', 'updateMany')[0].args).toEqual({
      where: { stylist_id: 's-1' }, data: { stylist_id: null },
    });
  });

  it('detaches consultation history with typed updateMany and never deletes it', async () => {
    await deleteAccount('u-1', mockPrisma);
    // No raw SQL anywhere in the deletion.
    expect(calls.filter((c) => c.model === '$executeRaw')).toEqual([]);
    const both = { in: ['u-1', 's-1'] };
    expect(ops('consent_records', 'updateMany')[0].args).toEqual({
      where: { stylist_id: both }, data: { stylist_id: null },
    });
    expect(ops('consultation_appointments', 'updateMany')[0].args).toEqual({
      where: { stylistId: both }, data: { stylistId: null },
    });
    expect(ops('consultation_records', 'updateMany').map((c) => c.args)).toEqual([
      { where: { stylistId: both }, data: { stylistId: null } },
      { where: { confirmedBy: both }, data: { confirmedBy: null } },
    ]);
    // The deleted stylist's invitations are revoked IN THE SAME statement
    // as the detach — one atomic update, so the revoke actually lands.
    // (The old raw-SQL sequence nulled stylistId first and then revoked
    // WHERE stylistId matched, which matched zero rows.)
    const tokens = ops('client_report_tokens', 'updateMany');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].args.where).toEqual({ stylistId: both });
    expect(tokens[0].args.data.stylistId).toBeNull();
    expect(tokens[0].args.data.revokedAt).toBeInstanceOf(Date);
    expect(ops('client_reports', 'updateMany').map((c) => c.args)).toEqual([
      { where: { stylistId: both }, data: { stylistId: null } },
      { where: { confirmedBy: both }, data: { confirmedBy: null } },
    ]);
    // Nothing on the five tables is ever deleted.
    for (const m of ['consent_records', 'consultation_appointments', 'consultation_records',
      'client_report_tokens', 'client_reports']) {
      expect(ops(m, 'deleteMany')).toEqual([]);
      expect(ops(m, 'delete')).toEqual([]);
    }
  });

  it('cancels user- and stylist-level subscriptions only, never salon-level', async () => {
    await deleteAccount('u-1', mockPrisma);
    const w = ops('subscriptions', 'updateMany')[0].args;
    expect(w.where.OR).toEqual([
      { subscriber_type: 'user', subscriber_id: 'u-1' },
      { subscriber_type: 'stylist', subscriber_id: 's-1' },
    ]);
    expect(JSON.stringify(w.where)).not.toContain('salon');
    expect(w.data).toMatchObject({ status: 'canceled', cancellation_reason: 'account_deleted' });
  });

  it('cancels live Square subscriptions for user + stylist before any delete, never salon, never grants', async () => {
    state.subs = [
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'pro', status: 'active', square_subscription_id: 'sq-user', created_at: new Date('2026-01-01') },
      { subscriber_type: 'stylist', subscriber_id: 's-1', tier: 'pro', status: 'active', square_subscription_id: 'sq-stylist', created_at: new Date('2026-01-01') },
      { subscriber_type: 'salon', subscriber_id: 'salon-1', tier: 'pro', status: 'active', square_subscription_id: 'sq-salon', created_at: new Date('2026-01-01') },
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'grant:founding', status: 'active', square_subscription_id: null, created_at: new Date('2026-01-01') },
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'pro', status: 'canceled', square_subscription_id: 'sq-old', created_at: new Date('2026-01-01') },
    ];
    await deleteAccount('u-1', mockPrisma);
    expect(mockCancelSquare.mock.calls).toEqual([['sq-user'], ['sq-stylist']]);
    // Square cancels run before the first database delete.
    const firstCancel = calls.findIndex((c) => c.model === 'square');
    const firstDelete = calls.findIndex((c) => c.op === 'deleteMany');
    expect(firstCancel).toBeGreaterThan(-1);
    expect(firstCancel).toBeLessThan(firstDelete);
  });

  it('skips Square subscriptions already terminal at Square (pre-validation)', async () => {
    state.subs = [
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'pro', status: 'active', square_subscription_id: 'sq-live', created_at: new Date('2026-01-01') },
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'pro', status: 'active', square_subscription_id: 'sq-dead', created_at: new Date('2026-01-01') },
    ];
    mockGetSquareSubscription.mockImplementation(async (id: string) => ({
      status: id === 'sq-dead' ? 'CANCELED' : 'ACTIVE',
    }));
    const res = await deleteAccount('u-1', mockPrisma);
    expect(res).toEqual({ deleted: true, stylistAnonymized: true });
    expect(mockCancelSquare.mock.calls).toEqual([['sq-live']]);
  });

  it('skips a Square subscription the status fetch proves gone (404)', async () => {
    state.subs = [
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'pro', status: 'active', square_subscription_id: 'sq-gone', created_at: new Date('2026-01-01') },
    ];
    mockGetSquareSubscription.mockRejectedValueOnce({ statusCode: 404 });
    const res = await deleteAccount('u-1', mockPrisma);
    expect(res).toEqual({ deleted: true, stylistAnonymized: true });
    expect(mockCancelSquare).not.toHaveBeenCalled();
  });

  it('attempts the cancel when the status fetch fails for a non-404 reason', async () => {
    state.subs = [
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'pro', status: 'active', square_subscription_id: 'sq-user', created_at: new Date('2026-01-01') },
    ];
    mockGetSquareSubscription.mockRejectedValueOnce({ statusCode: 500 });
    const res = await deleteAccount('u-1', mockPrisma);
    expect(res).toEqual({ deleted: true, stylistAnonymized: true });
    expect(mockCancelSquare.mock.calls).toEqual([['sq-user']]);
  });

  it('skips the Square cancel entirely when no live Square subscription exists', async () => {
    state.subs = [
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'grant:team', status: 'active', square_subscription_id: null, created_at: new Date('2026-01-01') },
    ];
    const res = await deleteAccount('u-1', mockPrisma);
    expect(res).toEqual({ deleted: true, stylistAnonymized: true });
    expect(mockCancelSquare).not.toHaveBeenCalled();
  });

  it('aborts the deletion when the Square cancel fails — nothing is deleted', async () => {
    state.subs = [
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'pro', status: 'active', square_subscription_id: 'sq-user', created_at: new Date('2026-01-01') },
    ];
    mockCancelSquare.mockRejectedValueOnce(new Error('square down'));
    await expect(deleteAccount('u-1', mockPrisma)).rejects.toThrow('square down');
    expect(ops('users', 'delete')).toEqual([]);
    expect(calls.filter((c) => ['deleteMany', 'updateMany', 'update', 'delete'].includes(c.op))).toEqual([]);
  });

  it('touches no salon records — consultation writes stay inside the five tables', async () => {
    await deleteAccount('u-1', mockPrisma);
    // Prisma-model calls never name a salon/client/inventory table.
    expect(calls.some((c) => /salon|clients|inventory/.test(c.model))).toBe(false);
    // Consultation-history writes are confined to the five tables. They DO
    // touch client_reports / client_report_tokens — those are the deleted
    // stylist's own consultation records, detached by design — and never
    // salon, clients, or inventory tables.
    const FIVE = ['consent_records', 'consultation_appointments', 'consultation_records',
      'client_report_tokens', 'client_reports'];
    const consult = calls.filter((c) => FIVE.includes(c.model));
    expect(consult.length).toBeGreaterThan(0);
    for (const c of consult) {
      expect(c.op).toBe('updateMany');
    }
    expect(new Set(consult.map((c) => c.model)).size).toBe(5);
  });

  it('handles a user with no stylist profile', async () => {
    state.stylist = null;
    const res = await deleteAccount('u-1', mockPrisma);
    expect(res).toEqual({ deleted: true, stylistAnonymized: false });
    expect(ops('stylists', 'update')).toEqual([]);
    expect(ops('community_posts')).toEqual([]);
    expect(ops('formula_comments', 'deleteMany')[0].args.where).toEqual({ author_id: { in: ['u-1'] } });
    expect(ops('users', 'delete')).toHaveLength(1);
  });

  it('rejects (transaction aborts) if any step fails', async () => {
    state.failOn = 'community_posts.deleteMany';
    await expect(deleteAccount('u-1', mockPrisma)).rejects.toThrow('boom');
    expect(ops('users', 'delete')).toEqual([]);
  });
});

describe('getAccountPlanState / planLabel', () => {
  it('labels tiers', () => {
    expect(planLabel('grant:founding')).toBe('Complimentary access');
    expect(planLabel('pro')).toBe('Pro');
    expect(planLabel('studio_team')).toBe('Studio Team');
    expect(planLabel(null)).toBeNull();
  });

  it('reports no plan when there are no rows', async () => {
    expect(await getAccountPlanState('u-1', mockPrisma)).toMatchObject({ hasAccess: false, tier: null });
  });

  it('prefers an active row (incl. salon-level) over a newer canceled one', async () => {
    state.subs = [
      { subscriber_type: 'salon', subscriber_id: 'salon-1', tier: 'pro', status: 'active', created_at: new Date('2026-01-01'), current_period_end: new Date('2026-12-01') },
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'starter', status: 'canceled', created_at: new Date('2026-06-01'), current_period_end: null },
    ];
    expect(await getAccountPlanState('u-1', mockPrisma)).toEqual({
      hasAccess: true, tier: 'pro', label: 'Pro', status: 'active', scope: 'salon',
      currentPeriodEnd: '2026-12-01T00:00:00.000Z',
    });
  });

  it('reports the latest non-active row when nothing is active', async () => {
    state.subs = [
      { subscriber_type: 'stylist', subscriber_id: 's-1', tier: 'grant:team', status: 'revoked', created_at: new Date('2026-03-01'), current_period_end: null },
    ];
    expect(await getAccountPlanState('u-1', mockPrisma)).toMatchObject({
      hasAccess: false, tier: 'grant:team', status: 'revoked', scope: 'stylist',
    });
  });
});

describe('/api/account route', () => {
  it('GET 401 without auth', async () => {
    expect((await GET(req('GET'))).status).toBe(401);
  });

  it('GET returns account + plan + web manage URL', async () => {
    mockGetUserFromRequest.mockImplementation(async () => ({ userId: 'u-1' }));
    const res = await GET(req('GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.account).toMatchObject({ id: 'u-1', email: 'ana@salon.test', name: 'Ana Ray' });
    expect(body.data.plan).toMatchObject({ hasAccess: false });
    expect(body.data.manageUrl).toBe('https://getcoloriq.co/get-access');
  });

  it('DELETE 401 without auth, and deletes nothing', async () => {
    const res = await DELETE(req('DELETE', { confirm: 'DELETE' }));
    expect(res.status).toBe(401);
    expect(ops('users', 'delete')).toEqual([]);
  });

  it('DELETE 400 without the confirmation token, and deletes nothing', async () => {
    mockGetUserFromRequest.mockImplementation(async () => ({ userId: 'u-1' }));
    for (const body of [undefined, {}, { confirm: 'delete' }, { confirm: true }]) {
      const res = await DELETE(req('DELETE', body));
      expect(res.status).toBe(400);
    }
    expect(calls).toEqual([]);
  });

  it('DELETE 200 deletes the authenticated user (not a body-supplied id) and clears the cookie', async () => {
    mockGetUserFromRequest.mockImplementation(async () => ({ userId: 'u-1' }));
    const res = await DELETE(req('DELETE', { confirm: 'DELETE', userId: 'someone-else' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { deleted: true } });
    expect(ops('users', 'delete')[0].args).toEqual({ where: { id: 'u-1' } });
    expect(mockClearAuthCookie).toHaveBeenCalled();
  });

  it('DELETE 404 when the account is already gone', async () => {
    mockGetUserFromRequest.mockImplementation(async () => ({ userId: 'u-1' }));
    state.user = null;
    expect((await DELETE(req('DELETE', { confirm: 'DELETE' }))).status).toBe(404);
  });

  it('DELETE 500 with a safe message when the transaction fails', async () => {
    mockGetUserFromRequest.mockImplementation(async () => ({ userId: 'u-1' }));
    state.failOn = 'users.delete';
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await DELETE(req('DELETE', { confirm: 'DELETE' }));
    spy.mockRestore();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('DELETION_FAILED');
    expect(JSON.stringify(body)).not.toContain('boom');
  });

  it('DELETE 500 with a safe message when the Square cancel fails, and deletes nothing', async () => {
    mockGetUserFromRequest.mockImplementation(async () => ({ userId: 'u-1' }));
    state.subs = [
      { subscriber_type: 'user', subscriber_id: 'u-1', tier: 'pro', status: 'active', square_subscription_id: 'sq-user', created_at: new Date('2026-01-01') },
    ];
    mockCancelSquare.mockRejectedValueOnce(new Error('square down'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await DELETE(req('DELETE', { confirm: 'DELETE' }));
    spy.mockRestore();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('DELETION_FAILED');
    expect(JSON.stringify(body)).not.toContain('square down');
    expect(ops('users', 'delete')).toEqual([]);
  });
});
