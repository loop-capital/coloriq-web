/**
 * Phase 1 item 2 harness — real route handlers against a fake prisma.
 * No live database exists here, so the fake below stands in for the DB:
 * it honors exactly the where/orderBy/include clauses the rewritten
 * routes emit (equals, { in }, { not: null }, single-key orderBy).
 * Nothing in this file touches mock-data: if a route still served mock
 * rows, these assertions (DB-derived brands, photos, ids) would fail.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Seed ──────────────────────────────────────────────────────────────────

const STYLIST_1 = {
  id: 'sty-1', user_id: 'user-1', display_name: 'Ana Ray', first_name: 'Ana',
  last_name: 'Ray', avatar_url: 'https://example.test/ana.png', bio: 'Colorist',
  instagram_handle: 'anacolor', follower_count: 10,
};
const STYLIST_2 = {
  id: 'sty-2', user_id: 'user-2', display_name: 'Bo Lee', first_name: 'Bo',
  last_name: 'Lee', avatar_url: null, bio: null, instagram_handle: null, follower_count: 0,
};
const FORM_1 = { brand: 'Wella', product_line: 'Koleston', target_level: '6', target_tone: 'golden', primary_formula: {} };
const FORM_2 = { brand: 'Pulp Riot', product_line: 'FACTION8', target_level: '7', target_tone: 'ash', primary_formula: {} };

const GOOD_CONSENT = { method: 'verbal', attested_at: '2026-10-20T10:00:00.000Z', attested_by: 'sty-1', client_ref: null, note: null };

const TRANSFORMATIONS: any[] = [
  { id: 't-1', stylist_id: 'sty-1', status: 'published', after_photo_ref: 'after-1', before_photo_ref: 'before-1',
    shade_story: 'Caramel balayage', shades: [{ shade_code: '6/73', shade_name: 'Dark Blonde Golden', tone: 'golden', color_hex: '#B67C4A' }],
    client_consent: GOOD_CONSENT, published_post_ref: null, published_at: new Date('2026-10-25T10:00:00Z'), created_at: new Date('2026-10-24T10:00:00Z'),
    stylist: STYLIST_1, formulation: FORM_1 },
  { id: 't-2', stylist_id: 'sty-1', status: 'published', after_photo_ref: 'after-2', before_photo_ref: 'before-2',
    shade_story: 'No consent row', shades: [], client_consent: null, published_post_ref: null,
    published_at: new Date('2026-10-26T10:00:00Z'), created_at: new Date('2026-10-26T10:00:00Z'),
    stylist: STYLIST_1, formulation: FORM_1 },
  { id: 't-3', stylist_id: 'sty-1', status: 'draft', after_photo_ref: 'after-3', before_photo_ref: 'before-3',
    shade_story: 'Draft row', shades: [], client_consent: GOOD_CONSENT, published_post_ref: null,
    published_at: null, created_at: new Date('2026-10-26T10:00:00Z'),
    stylist: STYLIST_1, formulation: FORM_1 },
  { id: 't-4', stylist_id: 'sty-2', status: 'published', after_photo_ref: 'after-4', before_photo_ref: 'before-4',
    shade_story: 'Malformed consent', shades: [], client_consent: { method: 'bogus' }, published_post_ref: null,
    published_at: new Date('2026-10-26T10:00:00Z'), created_at: new Date('2026-10-26T10:00:00Z'),
    stylist: STYLIST_2, formulation: FORM_2 },
  { id: 't-5', stylist_id: 'sty-2', status: 'published', after_photo_ref: 'after-5', before_photo_ref: 'before-5',
    shade_story: 'Ash work', shades: [], client_consent: GOOD_CONSENT, published_post_ref: 'ext-5',
    published_at: new Date('2026-10-27T10:00:00Z'), created_at: new Date('2026-10-27T10:00:00Z'),
    stylist: STYLIST_2, formulation: FORM_2 },
];

const POSTS: any[] = [
  { id: 'p-1', stylist_id: 'user-1', type: 'tip', content: 'hello world balayage tips', title: 'My post',
    tags: ['balayage'], images: ['img-1'], is_anonymous: false, moderation_status: 'pending',
    like_count: 3, comment_count: 1, score: 50, formula_id: null, formula_label: null,
    created_at: new Date('2026-10-25T09:00:00Z'), updated_at: new Date('2026-10-25T09:00:00Z'), stylist: STYLIST_1 },
  { id: 'p-2', stylist_id: 'sty-2', type: 'tip', content: 'other stylist post', title: null,
    tags: [], images: [], is_anonymous: false, moderation_status: 'pending',
    like_count: 0, comment_count: 0, score: 99, formula_id: null, formula_label: null,
    created_at: new Date('2026-10-26T09:00:00Z'), updated_at: new Date('2026-10-26T09:00:00Z'), stylist: STYLIST_2 },
  { id: 'p-3', stylist_id: 'sty-1', type: 'question', content: 'second own post', title: null,
    tags: [], images: [], is_anonymous: false, moderation_status: 'pending',
    like_count: 0, comment_count: 0, score: 80, formula_id: null, formula_label: null,
    created_at: new Date('2026-10-26T09:00:00Z'), updated_at: new Date('2026-10-26T09:00:00Z'), stylist: STYLIST_1 },
  { id: 'p-4', stylist_id: 'user-1', type: 'tip', content: 'anonymous own post', title: null,
    tags: [], images: [], is_anonymous: true, moderation_status: 'pending',
    like_count: 0, comment_count: 0, score: 10, formula_id: null, formula_label: null,
    created_at: new Date('2026-10-27T09:00:00Z'), updated_at: new Date('2026-10-27T09:00:00Z'), stylist: STYLIST_1 },
];

const LIKES: any[] = [{ post_id: 'p-1', user_id: 'sty-1' }];
const COMMENTS: any[] = [
  { id: 'c-1', post_id: 'p-1', author_id: 'sty-2', content: 'nice work', is_approved: true, is_flagged: false, created_at: new Date('2026-10-25T10:00:00Z'), author: STYLIST_2 },
  { id: 'c-2', post_id: 'p-1', author_id: 'sty-2', content: 'flagged comment', is_approved: true, is_flagged: true, created_at: new Date('2026-10-25T11:00:00Z'), author: STYLIST_2 },
  { id: 'c-3', post_id: 'p-1', author_id: 'sty-2', content: 'unapproved comment', is_approved: false, is_flagged: false, created_at: new Date('2026-10-25T12:00:00Z'), author: STYLIST_2 },
];

// ─── Fake prisma (honors the clauses the routes emit) ─────────────────────

function matchWhere(row: any, where: any): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    const val = row[key];
    if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
      const c = cond as any;
      if ('in' in c) {
        if (!c.in.includes(val)) return false;
      } else if ('not' in c) {
        if (c.not === null && val === null) return false;
        if (c.not !== null && val === c.not) return false;
      } else {
        if (val !== cond) return false;
      }
    } else if (val !== cond) {
      return false;
    }
  }
  return true;
}

function applyQuery(rows: any[], args: any): any[] {
  let out = rows.filter((r) => matchWhere(r, args?.where));
  if (args?.orderBy) {
    const [key, dir] = Object.entries(args.orderBy)[0] as [string, string];
    out = [...out].sort((a, b) => {
      const av = a[key] instanceof Date ? a[key].getTime() : a[key];
      const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return dir === 'desc' ? (bv as any) - (av as any) : (av as any) - (bv as any);
    });
  }
  return out;
}

const mockPrisma: any = {
  transformations: {
    findMany: jest.fn(async (args: any) => applyQuery(TRANSFORMATIONS, args)),
  },
  community_posts: {
    findMany: jest.fn(async (args: any) => applyQuery(POSTS, args)),
    findUnique: jest.fn(async (args: any) => POSTS.find((p) => p.id === args.where.id) ?? null),
  },
  stylists: {
    findUnique: jest.fn(async (args: any) => {
      if (args.where.id) return [STYLIST_1, STYLIST_2].find((s) => s.id === args.where.id) ?? null;
      if (args.where.user_id) return [STYLIST_1, STYLIST_2].find((s) => s.user_id === args.where.user_id) ?? null;
      return null;
    }),
    findFirst: jest.fn(async (args: any) => {
      if (args.where.user_id) return [STYLIST_1, STYLIST_2].find((s) => s.user_id === args.where.user_id) ?? null;
      return null;
    }),
  },
  post_likes: {
    findMany: jest.fn(async (args: any) => applyQuery(LIKES, args)),
  },
  post_comments: {
    findMany: jest.fn(async (args: any) => applyQuery(COMMENTS, args)),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
const mockGetCurrentUser = jest.fn(async (_req: any) => null);
jest.mock('@/lib/api/auth', () => ({ getCurrentUser: (...a: any[]) => (mockGetCurrentUser as any)(...a) }));

// Routes under test (real handlers).
import { GET as galleryPublic } from '../app/api/gallery/public/route';
import { GET as galleryTrending } from '../app/api/gallery/trending/route';
import { GET as gallerySeasonal } from '../app/api/gallery/seasonal/route';
import { GET as galleryStylist } from '../app/api/gallery/stylist/[id]/route';
import { GET as communityFeed } from '../app/api/community/feed/route';
import { GET as communityTrending } from '../app/api/community/trending/route';
import { GET as communityPost } from '../app/api/community/posts/[id]/route';

async function body(res: any): Promise<any> {
  return res.json();
}

function urlReq(path: string): any {
  return { url: `http://test.local${path}`, nextUrl: { searchParams: new URLSearchParams(path.split('?')[1] || '') } };
}

const READER_1 = { id: 'user-1', email: 'ana@test.local', username: 'ana' };

beforeEach(() => {
  jest.clearAllMocks();
  (mockGetCurrentUser as any).mockResolvedValue(null);
});

describe('gallery/public — DB reads with consent filter', () => {
  it('serves only published, consented transformations with DB-derived fields', async () => {
    const res = await galleryPublic(urlReq('/api/gallery/public?limit=20'));
    const json = await body(res);
    expect(json.success).toBe(true);
    expect(json.data.map((i: any) => i.id)).toEqual(['t-5', 't-1']);
    const first = json.data.find((i: any) => i.id === 't-1');
    expect(first.after_photo).toBe('after-1');
    expect(first.formulation_snapshot.brand).toBe('Wella');
    expect(first.formulation_snapshot.shade_code).toBe('6/73');
    expect(first.stylist_name).toBe('Ana Ray');
    expect(first).not.toHaveProperty('client_consent');
    expect(json.meta.total).toBe(2);
  });

  it('excludes draft, consent-less, and malformed-consent rows', async () => {
    const json = await body(await galleryPublic(urlReq('/api/gallery/public?limit=20')));
    const ids = json.data.map((i: any) => i.id);
    expect(ids).not.toContain('t-2');
    expect(ids).not.toContain('t-3');
    expect(ids).not.toContain('t-4');
  });

  it('color_family filters on the derived family; season matches nothing', async () => {
    const warm = await body(await galleryPublic(urlReq('/api/gallery/public?color_family=golden')));
    expect(warm.data.map((i: any) => i.id)).toEqual(['t-1']);
    const seasonal = await body(await galleryPublic(urlReq('/api/gallery/public?season=spring')));
    expect(seasonal.data).toEqual([]);
    expect(seasonal.meta.total).toBe(0);
  });
});

describe('gallery/trending + seasonal + stylist', () => {
  it('aggregates only consented transformations, by shade', async () => {
    const json = await body(await galleryTrending());
    expect(json.success).toBe(true);
    expect(json.meta.total).toBe(2);
    const wella = json.data.find((c: any) => c.brand === 'Wella');
    expect(wella.post_count).toBe(1);
    expect(wella.shade_code).toBe('6/73');
    expect(wella.like_count).toBe(0);
    expect(wella.sample_photos).toEqual(['after-1']);
  });

  it('seasonal returns an empty list (no collection entity in the DB)', async () => {
    const json = await body(await gallerySeasonal(urlReq('/api/gallery/seasonal')));
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
    expect(json.meta.total).toBe(0);
  });

  it('stylist portfolio: 404 for unknown, consented-only recent work for known', async () => {
    const missing = await body(await galleryStylist({} as any, { params: Promise.resolve({ id: 'nope' }) }));
    expect(missing.success).toBe(false);
    const ok = await body(await galleryStylist({} as any, { params: Promise.resolve({ id: 'sty-1' }) }));
    expect(ok.success).toBe(true);
    expect(ok.data.stylist_name).toBe('Ana Ray');
    expect(ok.data.portfolio_count).toBe(1);
    expect(ok.data.recent_work.map((i: any) => i.id)).toEqual(['t-1']);
    expect(ok.data).not.toHaveProperty('client_consent');
  });

  it('stylist portfolio resolves a users.id param to the stylist row', async () => {
    const ok = await body(await galleryStylist({} as any, { params: Promise.resolve({ id: 'user-1' }) }));
    expect(ok.success).toBe(true);
    expect(ok.data.stylist_id).toBe('sty-1');
  });
});

describe('community feed/trending — own posts only', () => {
  it('anonymous readers get an empty feed (others posts held out pre-item-4)', async () => {
    const json = await body(await communityFeed(urlReq('/api/community/feed?limit=20')));
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
    expect(json.meta.total).toBe(0);
  });

  it('authenticated readers see only their own posts under either id convention', async () => {
    (mockGetCurrentUser as any).mockResolvedValue(READER_1);
    const json = await body(await communityFeed(urlReq('/api/community/feed?limit=20')));
    const ids = json.data.map((p: any) => p.id);
    expect(ids).toContain('p-1');
    expect(ids).toContain('p-3');
    expect(ids).toContain('p-4');
    expect(ids).not.toContain('p-2');
    const anon = json.data.find((p: any) => p.id === 'p-4');
    expect(anon.author_name).toBe('Anonymous');
    expect(anon.author_avatar).toBeUndefined();
    const liked = json.data.find((p: any) => p.id === 'p-1');
    expect(liked.user_liked).toBe(true);
    expect(liked.user_saved).toBe(false);
  });

  it('feed search and trending sort work over own posts', async () => {
    (mockGetCurrentUser as any).mockResolvedValue(READER_1);
    const searched = await body(await communityFeed(urlReq('/api/community/feed?search=balayage')));
    expect(searched.data.map((p: any) => p.id)).toEqual(['p-1']);
    const trending = await body(await communityTrending(urlReq('/api/community/trending')));
    expect(trending.data.map((p: any) => p.id)).toEqual(['p-3', 'p-1', 'p-4']);
  });
});

describe('community post detail — owner only, approved comments only', () => {
  it('owner reads own post with approved, unflagged comments only', async () => {
    (mockGetCurrentUser as any).mockResolvedValue(READER_1);
    const json = await body(await communityPost({} as any, { params: Promise.resolve({ id: 'p-1' }) }));
    expect(json.success).toBe(true);
    expect(json.data.post.id).toBe('p-1');
    expect(json.data.post.user_liked).toBe(true);
    expect(json.data.comments.map((c: any) => c.id)).toEqual(['c-1']);
  });

  it('non-owner and anonymous get 404 for another stylist post (no leak)', async () => {
    (mockGetCurrentUser as any).mockResolvedValue(READER_1);
    const asNonOwner = await body(await communityPost({} as any, { params: Promise.resolve({ id: 'p-2' }) }));
    expect(asNonOwner.success).toBe(false);
    (mockGetCurrentUser as any).mockResolvedValue(null);
    const asAnon = await body(await communityPost({} as any, { params: Promise.resolve({ id: 'p-1' }) }));
    expect(asAnon.success).toBe(false);
  });
});
