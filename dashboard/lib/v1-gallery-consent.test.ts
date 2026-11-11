/**
 * Phase 1 item 2 (v1 port) harness — REAL GET handlers for
 * /api/v1/gallery/photos and /api/v1/gallery/feed against a fake prisma.
 *
 * No live database exists here, so the fake below stands in for the DB: it
 * honors exactly the where/orderBy/include clauses the gated routes emit
 * (equals, { in }, { not: null }, AND/OR, nested relation { some },
 * multi-key orderBy). Seed rows carry the full relation graph the routes
 * include (formulas -> formula_listings -> transformations).
 *
 * HONEST LABELING: the derivation basis under test is the LEGACY
 * stylist-attested single `client_consent` on transformations — NOT
 * (b) featuring consent. See lib/v1-gallery-consent.ts header.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Seed ──────────────────────────────────────────────────────────────────

const STYLIST_1 = {
  id: 'sty-1', user_id: 'user-1', display_name: 'Ana Ray', first_name: 'Ana',
  avatar_url: 'https://example.test/ana.png',
};
const STYLIST_2 = {
  id: 'sty-2', user_id: 'user-2', display_name: 'Bo Lee', first_name: 'Bo',
  avatar_url: null,
};

const GOOD_CONSENT = { method: 'verbal', attested_at: '2026-10-20T10:00:00.000Z' };

function tx(id: string, overrides: Record<string, unknown> = {}): any {
  return {
    id, status: 'published', after_photo_ref: 'after-x',
    client_consent: GOOD_CONSENT, ...overrides,
  };
}

function formula(id: string, brand: string, shade: string, transformations: any[]): any {
  return {
    id, product_brand: brand, product_shade: shade,
    formula_listings: [{ id: `listing-${id}`, transformations }],
  };
}

function formulaNoListings(id: string, brand: string, shade: string): any {
  return { id, product_brand: brand, product_shade: shade, formula_listings: [] };
}

const F_OWN = formulaNoListings('f-own', 'Wella', '6/73');
const F_GOOD = formula('f-good', 'Wella', '6/73', [tx('t-good')]);
const F_NONE = formulaNoListings('f-none', 'Matrix', '5N');
const F_DRAFT = formula('f-draft', 'Wella', '7/0', [tx('t-draft', { status: 'draft' })]);
const F_NOCONSENT = formula('f-noconsent', 'Wella', '7/0', [tx('t-noconsent', { client_consent: null })]);
const F_BADMETHOD = formula('f-badmethod', 'Wella', '7/0', [
  tx('t-badmethod', { client_consent: { method: 'bogus', attested_at: '2026-10-20T10:00:00.000Z' } }),
]);
const F_BADATTESTED = formula('f-badattested', 'Wella', '7/0', [
  tx('t-badattested', { client_consent: { method: 'signed', attested_at: 'not-a-date' } }),
]);
const F_NOATTESTED = formula('f-noattested', 'Wella', '7/0', [
  tx('t-noattested', { client_consent: { method: 'digital' } }),
]);
const F_NOAFTER = formula('f-noafter', 'Wella', '7/0', [
  tx('t-noafter', { after_photo_ref: null }),
]);

function photo(
  id: string, stylist: any, f: any, created: string, tone = 'A',
): any {
  return {
    id, formula_id: f.id, stylist_id: stylist.id, client_id: null,
    before_url: `https://example.test/${id}-before.jpg`,
    after_url: `https://example.test/${id}-after.jpg`,
    caption: `photo ${id}`, hair_type: null, porosity: null,
    level_before: 5, level_after: 6, tone_before: tone, tone_after: tone,
    developer_vol: 20, processing_time: 30, is_featured: false,
    is_approved: true, upvotes: 1, downvotes: 0, score: 1, view_count: 0,
    created_at: new Date(created), updated_at: new Date(created),
    photo_tags: [{ tag: 'balayage' }],
    _count: { photo_comments: 2 },
    stylists: stylist,
    formulas: f,
  };
}

const PHOTOS: any[] = [
  photo('ph-own', STYLIST_1, F_OWN, '2026-10-28T10:00:00Z', 'G'),
  photo('ph-good', STYLIST_2, F_GOOD, '2026-10-27T10:00:00Z', 'G'),
  photo('ph-none', STYLIST_2, F_NONE, '2026-10-26T10:00:00Z', 'A'),
  photo('ph-draft', STYLIST_2, F_DRAFT, '2026-10-25T10:00:00Z', 'A'),
  photo('ph-noconsent', STYLIST_2, F_NOCONSENT, '2026-10-24T10:00:00Z', 'A'),
  photo('ph-badmethod', STYLIST_2, F_BADMETHOD, '2026-10-23T10:00:00Z', 'A'),
  photo('ph-badattested', STYLIST_2, F_BADATTESTED, '2026-10-22T10:00:00Z', 'A'),
  photo('ph-noattested', STYLIST_2, F_NOATTESTED, '2026-10-21T10:00:00Z', 'A'),
  photo('ph-noafter', STYLIST_2, F_NOAFTER, '2026-10-20T10:00:00Z', 'A'),
];

const EXCLUDED_IDS = [
  'ph-none', 'ph-draft', 'ph-noconsent', 'ph-badmethod',
  'ph-badattested', 'ph-noattested', 'ph-noafter',
];

// ─── Fake prisma (honors the clauses the gated routes emit) ────────────────

function matchWhere(row: any, where: any): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'AND') {
      if (!Array.isArray(cond) || !(cond as any[]).every((w) => matchWhere(row, w))) return false;
      continue;
    }
    if (key === 'OR') {
      if (!Array.isArray(cond) || !(cond as any[]).some((w) => matchWhere(row, w))) return false;
      continue;
    }
    const val = row[key];
    if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
      const c = cond as any;
      if ('in' in c) {
        if (!c.in.includes(val)) return false;
      } else if ('not' in c) {
        if (c.not === null ? val === null : val === c.not) return false;
      } else if ('some' in c) {
        if (!Array.isArray(val) || !val.some((el) => matchWhere(el, c.some))) return false;
      } else {
        // Nested single relation object (e.g. formulas: { formula_listings: ... }).
        if (val === null || typeof val !== 'object' || Array.isArray(val)) return false;
        if (!matchWhere(val, cond)) return false;
      }
    } else if (val !== cond) {
      return false;
    }
  }
  return true;
}

function cmpVal(v: unknown): number | string | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return null;
}

function applyQuery(rows: any[], args: any): any[] {
  let out = rows.filter((r) => matchWhere(r, args?.where));
  if (args?.orderBy) {
    const keys = Object.entries(args.orderBy) as [string, string][];
    out = [...out].sort((a, b) => {
      for (const [key, dir] of keys) {
        const av = cmpVal(a[key]);
        const bv = cmpVal(b[key]);
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (av === bv) continue;
        return dir === 'desc'
          ? (bv as any) - (av as any)
          : (av as any) - (bv as any);
      }
      return 0;
    });
  }
  return out;
}

const mockPrisma: any = {
  formula_photos: {
    findMany: jest.fn(async (args: any) => applyQuery(PHOTOS, args)),
    count: jest.fn(async (args: any) => PHOTOS.filter((r) => matchWhere(r, args?.where)).length),
  },
  stylists: {
    findUnique: jest.fn(async (args: any) => {
      if (args.where.user_id) {
        return [STYLIST_1, STYLIST_2].find((s) => s.user_id === args.where.user_id) ?? null;
      }
      return null;
    }),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
const mockGetUserFromRequest = jest.fn(async (_req: any) => null);
jest.mock('@/lib/auth', () => ({
  getUserFromRequest: (...a: any[]) => (mockGetUserFromRequest as any)(...a),
}));

// Routes under test (real handlers).
import { GET as photosGet } from '../app/api/v1/gallery/photos/route';
import { GET as feedGet } from '../app/api/v1/gallery/feed/route';
import { hasValidStoredConsent } from './v1-gallery-consent';

async function body(res: any): Promise<any> {
  return res.json();
}

function urlReq(path: string): any {
  return { url: `http://test.local${path}` };
}

const READER_1 = { userId: 'user-1', username: 'ana', email: 'ana@test.local' };

beforeEach(() => {
  jest.clearAllMocks();
  (mockGetUserFromRequest as any).mockResolvedValue(null);
});

describe('hasValidStoredConsent — strict, no defaulting', () => {
  it('accepts a well-formed record', () => {
    expect(hasValidStoredConsent(GOOD_CONSENT)).toBe(true);
  });
  it('missing attested_at gives false', () => {
    expect(hasValidStoredConsent({ method: 'verbal' })).toBe(false);
  });
  it('method outside the enum gives false', () => {
    expect(hasValidStoredConsent({ method: 'bogus', attested_at: '2026-10-20T10:00:00.000Z' })).toBe(false);
  });
  it('unparseable attested_at gives false', () => {
    expect(hasValidStoredConsent({ method: 'signed', attested_at: 'not-a-date' })).toBe(false);
  });
  it('null, array, and non-object give false', () => {
    expect(hasValidStoredConsent(null)).toBe(false);
    expect(hasValidStoredConsent([GOOD_CONSENT])).toBe(false);
    expect(hasValidStoredConsent('verbal')).toBe(false);
  });
});

describe('GET /api/v1/gallery/photos — consent-gated', () => {
  it('reader sees own photo plus consented other photo; total is the gated count; no consent leaks', async () => {
    (mockGetUserFromRequest as any).mockResolvedValue(READER_1);
    const json = await body(await photosGet(urlReq('/api/v1/gallery/photos?limit=20')));
    expect(json.items.map((i: any) => i.id)).toEqual(['ph-own', 'ph-good']);
    // 9 approved candidates, 2 servable — total must be the gated count.
    expect(json.total).toBe(2);
    expect(json.limit).toBe(20);
    expect(json.offset).toBe(0);
    expect(JSON.stringify(json)).not.toContain('client_consent');
    expect(JSON.stringify(json)).not.toContain('consent');
    const own = json.items.find((i: any) => i.id === 'ph-own');
    expect(own.brand).toBe('Wella');
    expect(own.shades).toEqual(['6/73']);
    expect(own.stylistName).toBe('Ana Ray');
  });

  it('fail closed: approved photos with no, draft, or invalid-consent basis are absent', async () => {
    (mockGetUserFromRequest as any).mockResolvedValue(READER_1);
    const json = await body(await photosGet(urlReq('/api/v1/gallery/photos?limit=100')));
    const ids = json.items.map((i: any) => i.id);
    for (const excluded of EXCLUDED_IDS) expect(ids).not.toContain(excluded);
  });

  it('paginates over the gated set, not the candidate set', async () => {
    (mockGetUserFromRequest as any).mockResolvedValue(READER_1);
    const page1 = await body(await photosGet(urlReq('/api/v1/gallery/photos?limit=1&offset=0')));
    expect(page1.items.map((i: any) => i.id)).toEqual(['ph-own']);
    expect(page1.total).toBe(2);
    const page2 = await body(await photosGet(urlReq('/api/v1/gallery/photos?limit=1&offset=1')));
    expect(page2.items.map((i: any) => i.id)).toEqual(['ph-good']);
    expect(page2.total).toBe(2);
    // The route fetches candidates without take/skip and slices in JS.
    const call = (mockPrisma.formula_photos.findMany as any).mock.calls[0][0];
    expect(call).not.toHaveProperty('take');
    expect(call).not.toHaveProperty('skip');
  });

  it('existing filters still work: formulaId narrows within the gated set', async () => {
    (mockGetUserFromRequest as any).mockResolvedValue(READER_1);
    const good = await body(await photosGet(urlReq('/api/v1/gallery/photos?formulaId=f-good')));
    expect(good.items.map((i: any) => i.id)).toEqual(['ph-good']);
    expect(good.total).toBe(1);
    const none = await body(await photosGet(urlReq('/api/v1/gallery/photos?formulaId=f-none')));
    expect(none.items).toEqual([]);
    expect(none.total).toBe(0);
  });

  it('anonymous reader: only the consented other photo; own-rule cannot apply', async () => {
    const json = await body(await photosGet(urlReq('/api/v1/gallery/photos?limit=20')));
    expect(json.items.map((i: any) => i.id)).toEqual(['ph-good']);
    expect(json.total).toBe(1);
    expect(JSON.stringify(json)).not.toContain('client_consent');
  });

  it('auth failure degrades to anonymous, never 500', async () => {
    (mockGetUserFromRequest as any).mockRejectedValueOnce(new Error('bad token'));
    const res: any = await photosGet(urlReq('/api/v1/gallery/photos?limit=20'));
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.items.map((i: any) => i.id)).toEqual(['ph-good']);
    expect(json.total).toBe(1);
  });
});

describe('GET /api/v1/gallery/feed — consent-gated', () => {
  it('reader sees own photo plus consented other photo; total is the gated count; no consent leaks', async () => {
    (mockGetUserFromRequest as any).mockResolvedValue(READER_1);
    const json = await body(await feedGet(urlReq('/api/v1/gallery/feed?limit=20')));
    expect(json.items.map((i: any) => i.id)).toEqual(['ph-own', 'ph-good']);
    expect(json.total).toBe(2);
    expect(JSON.stringify(json)).not.toContain('client_consent');
    expect(JSON.stringify(json)).not.toContain('consent');
  });

  it('fail closed: approved photos with no, draft, or invalid-consent basis are absent', async () => {
    (mockGetUserFromRequest as any).mockResolvedValue(READER_1);
    const json = await body(await feedGet(urlReq('/api/v1/gallery/feed?limit=100')));
    const ids = json.items.map((i: any) => i.id);
    for (const excluded of EXCLUDED_IDS) expect(ids).not.toContain(excluded);
  });

  it('anonymous reader: only the consented other photo; total equals the gated count', async () => {
    const json = await body(await feedGet(urlReq('/api/v1/gallery/feed?limit=20')));
    expect(json.items.map((i: any) => i.id)).toEqual(['ph-good']);
    expect(json.total).toBe(1);
  });

  it('auth failure degrades to anonymous, never 500', async () => {
    (mockGetUserFromRequest as any).mockRejectedValueOnce(new Error('bad token'));
    const res: any = await feedGet(urlReq('/api/v1/gallery/feed?limit=20'));
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.items.map((i: any) => i.id)).toEqual(['ph-good']);
    expect(json.total).toBe(1);
  });

  it('existing tone and level filters still work within the gated set', async () => {
    (mockGetUserFromRequest as any).mockResolvedValue(READER_1);
    const tone = await body(await feedGet(urlReq('/api/v1/gallery/feed?tone=G')));
    expect(tone.items.map((i: any) => i.id)).toEqual(['ph-own', 'ph-good']);
    expect(tone.total).toBe(2);
    const level = await body(await feedGet(urlReq('/api/v1/gallery/feed?level=6')));
    expect(level.items.map((i: any) => i.id)).toEqual(['ph-own', 'ph-good']);
    expect(level.total).toBe(2);
    const noMatch = await body(await feedGet(urlReq('/api/v1/gallery/feed?tone=K')));
    expect(noMatch.items).toEqual([]);
    expect(noMatch.total).toBe(0);
  });
});
