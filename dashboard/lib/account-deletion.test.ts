/**
 * Account deletion (Apple 5.1.1(v)) — lib/account-deletion.ts and the REAL
 * GET/DELETE handlers in app/api/account/route.ts against a fake prisma.
 *
 * No live database here: the fake records every call so the tests assert
 * exactly which rows are deleted, which are anonymized, and which are left
 * alone. FK behavior / transaction rollback is the DB's job and is not
 * simulated beyond "an error inside the transaction rejects the call".
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
    if (op === 'deleteMany' || op === 'updateMany') return { count: 1 };
    return {};
  };
  return new Proxy({}, { get: (_t, op: string) => handler(op) });
}

const MODELS = [
  'users', 'stylists', 'subscriptions', 'formulas', 'formula_comments', 'formula_photo_comments',
  'trend_searches', 'webhooks', 'post_likes', 'post_comments', 'community_posts', 'transformations',
  'formula_photos', 'photo_analyses', 'api_keys',
];

const mockPrisma: any = Object.fromEntries(MODELS.map((m) => [m, model(m)]));
mockPrisma.$transaction = async (fn: (tx: any) => Promise<any>) => fn(mockPrisma);

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
const mockGetUserFromRequest = jest.fn(async (_req: any): Promise<any> => null);
const mockClearAuthCookie = jest.fn(async () => {});
jest.mock('@/lib/auth', () => ({
  getUserFromRequest: (...a: any[]) => (mockGetUserFromRequest as any)(...a),
  clearAuthCookie: () => mockClearAuthCookie(),
}));

import { deleteAccount, getAccountPlanState, planLabel, DELETED_EMAIL_DOMAIN } from './account-deletion';
import { GET, DELETE } from '../app/api/account/route';

const USER = { id: 'u-1', email: 'ana@salon.test', first_name: 'Ana', last_name: 'Ray', salon_id: 'salon-1', created_at: new Date('2026-01-01') };
const STYLIST = { id: 's-1' };

function req(method: string, body?: unknown): any {
  return new Request('http://localhost/api/account', {
    method,
    headers: { 'content-type': 'application/json', authorization: 'Bearer t' },
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
    expect(ops('formula_photos', 'deleteMany')[0].args.where).toEqual({ stylist_id: 's-1' });
    expect(ops('photo_analyses', 'deleteMany')[0].args.where).toEqual({ stylist_id: 's-1' });
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

  it('never touches salon tables', async () => {
    await deleteAccount('u-1', mockPrisma);
    expect(calls.some((c) => /salon|clients|inventory/.test(c.model))).toBe(false);
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
});
