/**
 * Real pool reads (Phase 1, item 2).
 *
 * Replaces lib/api/mock-data on the gallery/community read paths with
 * database reads, with the consent filter applied. See the item-2 report
 * for the full design; the rules that matter are stated here so they
 * cannot drift silently:
 *
 * TRANSFORMATIONS (gallery content):
 *  - Only status='published' rows with an after photo AND a valid stored
 *    marketing consent record (client_consent) reach any reader. Publish
 *    writes that record through validateConsent, so a published row
 *    normally carries one; the read filter re-checks it anyway and never
 *    serves a published row whose consent is missing or malformed.
 *  - No consent record is ever exposed: GalleryItem has no consent field.
 *
 * COMMUNITY POSTS (community content):
 *  - community_posts carries NO stored consent field (share on main is
 *    ungated; item 3 validates at creation without persisting; item 4
 *    owns persistence). A read filter therefore CANNOT verify consent
 *    for another stylist's post. Consequence, stated plainly:
 *    - Another stylist's community post is NEVER served by these routes,
 *      for any reader, until item 4 persists consent.
 *    - A reader's OWN posts are served (no consent question arises for
 *      one's own content). Own = stylist_id matches the reader's JWT
 *      user id OR the reader's resolved stylist id, because both
 *      conventions exist in this codebase (share writes the JWT user id;
 *      vote/transformation paths use the stylist id).
 *    - Anonymous readers see no community posts at all.
 *  - moderation_status is NOT consulted as a consent proxy: on main the
 *    only writer sets 'pending' and nothing ever changes it, and
 *    is_approved defaults true, so neither field carries a moderation
 *    signal. Moderation is a future workflow, not a filter input here.
 *
 * SAVES: post_likes models likes only; the vote route already returns
 * 501 for save/unsave ("no real backing table"). user_saved is therefore
 * always false on these reads — reported, not faked.
 */

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/api/auth';
import type { CommunityPost, CommunityPostType, GalleryItem, PostComment } from '@/lib/api/types';

export const CONSENT_METHODS = ['verbal', 'signed', 'digital'] as const;

/** A stored client_consent record counts only if it looks like one publish wrote. */
export function hasValidConsent(record: unknown): boolean {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  const r = record as { method?: unknown; attested_at?: unknown };
  if (!(CONSENT_METHODS as readonly unknown[]).includes(r.method)) return false;
  if (typeof r.attested_at !== 'string' || Number.isNaN(Date.parse(r.attested_at))) return false;
  return true;
}

const STYLIST_SELECT = {
  id: true,
  display_name: true,
  first_name: true,
  last_name: true,
  avatar_url: true,
  bio: true,
  instagram_handle: true,
  follower_count: true,
} as const;

const FORMULATION_SELECT = {
  brand: true,
  product_line: true,
  target_level: true,
  target_tone: true,
  primary_formula: true,
} as const;

export interface Reader {
  /** JWT user id (users.id), or null when anonymous. */
  userId: string | null;
  /** Resolved stylists.id for that user, or null when no stylist row exists. Read-only lookup: never creates. */
  stylistId: string | null;
}

/** Resolve the reader without writing: getCurrentUser + a non-creating stylist lookup. */
export async function resolveReader(request: unknown): Promise<Reader> {
  let user: { id: string } | null = null;
  try {
    user = await getCurrentUser(request as never);
  } catch {
    user = null;
  }
  if (!user) return { userId: null, stylistId: null };
  let stylist: { id: string } | null = null;
  try {
    stylist = await (prisma as any).stylists.findUnique({ where: { user_id: user.id } });
  } catch {
    stylist = null;
  }
  return { userId: user.id, stylistId: stylist?.id ?? null };
}

/** True when this community post belongs to the reader under either id convention. */
export function isOwnPost(row: { stylist_id: string }, reader: Reader): boolean {
  if (!reader.userId) return false;
  return row.stylist_id === reader.userId || (reader.stylistId !== null && row.stylist_id === reader.stylistId);
}

/** DB-level pre-filter for transformations; hasValidConsent is the authoritative check on top. */
export const PUBLISHED_TRANSFORMATION_WHERE = {
  status: 'published',
  after_photo_ref: { not: null },
} as const;

/** Published, consented transformations with their stylist + formulation, newest first. */
export async function fetchConsentedTransformations(): Promise<any[]> {
  const rows = await (prisma as any).transformations.findMany({
    where: { ...PUBLISHED_TRANSFORMATION_WHERE },
    include: { stylist: { select: STYLIST_SELECT }, formulation: { select: FORMULATION_SELECT } },
    orderBy: { published_at: 'desc' },
  });
  return (rows as any[]).filter((t) => hasValidConsent(t.client_consent));
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return new Date().toISOString();
}

export function displayName(stylist: any): string {
  if (!stylist) return 'Stylist';
  const d = str(stylist.display_name);
  if (d) return d;
  const full = `${str(stylist.first_name)} ${str(stylist.last_name)}`.trim();
  return full || 'Stylist';
}

function handleOf(stylist: any): string | undefined {
  const h = str(stylist?.instagram_handle);
  if (!h) return undefined;
  return h.startsWith('@') ? h : `@${h}`;
}

function findHex(value: unknown, depth: number): string {
  if (depth > 3 || value === null || typeof value !== 'object') return '';
  for (const v of Object.values(value as Record<string, unknown>)) {
    if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) return v;
    const nested = findHex(v, depth + 1);
    if (nested) return nested;
  }
  return '';
}

interface ShadeInfo {
  code: string;
  name: string;
  tone: string;
  hex: string;
  level: number;
}

/** Defensive extraction: shades Json has no fixed schema, so every field falls back. */
export function extractShadeInfo(shades: unknown, formulation: any): ShadeInfo {
  let code = '';
  let name = '';
  let tone = '';
  let hex = '';
  const items = Array.isArray(shades) ? shades : shades && typeof shades === 'object' ? [shades] : [];
  const first = items[0];
  if (first && typeof first === 'object') {
    const f = first as Record<string, unknown>;
    code = str(f.shade_code ?? f.code ?? f.shade);
    name = str(f.shade_name ?? f.name ?? '');
    tone = str(f.tone ?? '');
    hex = str(f.color_hex ?? f.hex ?? '');
  }
  if (!hex) hex = findHex(formulation?.primary_formula, 0);
  if (!tone) tone = str(formulation?.target_tone ?? '');
  let level = 0;
  const rawLevel = formulation?.target_level;
  if (rawLevel !== null && rawLevel !== undefined) {
    const n = parseInt(String(rawLevel), 10);
    if (Number.isFinite(n)) level = n;
  }
  return { code, name, tone, hex, level };
}

/** Coarse color family derived from tone; 'unknown' when no tone signal exists. */
export function deriveColorFamily(tone: string): string {
  const cleaned = tone.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return cleaned || 'unknown';
}

export function transformationToGalleryItem(t: any): GalleryItem {
  const shade = extractShadeInfo(t.shades, t.formulation);
  return {
    id: t.id,
    post_id: t.published_post_ref ?? t.id,
    stylist_id: t.stylist_id,
    stylist_name: displayName(t.stylist),
    stylist_avatar: t.stylist?.avatar_url ?? undefined,
    stylist_bio: t.stylist?.bio ?? undefined,
    formulation_snapshot: {
      brand: t.formulation?.brand ?? 'Unknown',
      line: t.formulation?.product_line ?? '',
      shade_code: shade.code,
      shade_name: shade.name,
      level: shade.level,
      tone: shade.tone,
      color_hex: shade.hex,
      color_family: deriveColorFamily(shade.tone),
    },
    after_photo: t.after_photo_ref,
    before_photo: t.before_photo_ref ?? undefined,
    caption: t.shade_story ?? undefined,
    tags: [],
    likes: 0,
    created_at: iso(t.published_at ?? t.created_at),
  };
}

const POST_TYPES: readonly string[] = ['tip', 'question', 'review', 'formula_share'];

export function serializeCommunityPost(
  row: any,
  voteState?: { liked: boolean }
): CommunityPost {
  const anonymous = row.is_anonymous === true;
  return {
    id: row.id,
    author_id: row.stylist_id,
    author_name: anonymous ? 'Anonymous' : displayName(row.stylist),
    author_avatar: anonymous ? undefined : row.stylist?.avatar_url ?? undefined,
    author_handle: anonymous ? undefined : handleOf(row.stylist),
    type: (POST_TYPES.includes(row.type) ? row.type : 'tip') as CommunityPostType,
    formulation_id: row.formula_id ?? undefined,
    image_urls: Array.isArray(row.images) ? row.images : [],
    caption: row.title ?? undefined,
    content: row.content ?? '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    likes: row.like_count ?? 0,
    saves: 0,
    comments: row.comment_count ?? 0,
    score: Number(row.score ?? 0),
    is_public: true,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
    user_liked: voteState?.liked ?? false,
    user_saved: false,
  };
}

/** A reader's own community posts (either id convention), with stylist rows attached. */
export async function fetchOwnCommunityPosts(reader: Reader): Promise<any[]> {
  if (!reader.userId) return [];
  const ids = [reader.userId, ...(reader.stylistId ? [reader.stylistId] : [])];
  return (prisma as any).community_posts.findMany({
    where: { stylist_id: { in: ids } },
    include: { stylist: { select: STYLIST_SELECT } },
    orderBy: { created_at: 'desc' },
  });
}

/** Like-state for a set of post ids, keyed by the resolved stylist id (post_likes has no save rows). */
export async function fetchLikeState(reader: Reader, postIds: string[]): Promise<Set<string>> {
  if (!reader.stylistId || postIds.length === 0) return new Set();
  const rows = await (prisma as any).post_likes.findMany({
    where: { user_id: reader.stylistId, post_id: { in: postIds } },
    select: { post_id: true },
  });
  return new Set((rows as any[]).map((r) => r.post_id));
}

export function serializePostComment(row: any): PostComment {
  return {
    id: row.id,
    post_id: row.post_id,
    author_id: row.author_id,
    author_name: displayName(row.author),
    author_avatar: row.author?.avatar_url ?? undefined,
    content: row.content ?? '',
    created_at: iso(row.created_at),
  };
}
