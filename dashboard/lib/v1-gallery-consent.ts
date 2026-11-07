/**
 * v1 gallery consent gate (Phase 1, item 2 — Jason's 2026-10-28 ruling, option (a)).
 *
 * The v1 gallery reads (/api/v1/gallery/photos, /api/v1/gallery/feed) serve
 * formula_photos rows. A row is served only when it is the reader's own photo
 * OR a featuring basis can be positively derived for it. Anything else is
 * EXCLUDED — the filter fails closed. is_approved:true is NOT consent.
 *
 * HONEST LABELING — read before calling this anything it is not:
 * - The derivation basis is the LEGACY stylist-attested single `client_consent`
 *   JSON as stored on transformations (pre-split model). It must NEVER be
 *   called (b)-filtered or featuring-consented. The (b)-canon model (item 4
 *   `consent_records`, Gideon-cleared wording) does not exist on main and is
 *   NOT what this filter enforces.
 * - GRANULARITY: derivation is per-FORMULA, not per-photo. `after_photo_ref`
 *   is an R2 key set by stylist PATCH on the transformation, not a per-photo
 *   FK, so a published, consented transformation on the photo's formula
 *   blesses that formula's approved photos. There is no formulas↔formulations
 *   link in the schema, so the join runs through the marketplace listing:
 *   photo.formula_id -> formulas -> formula_listings (source_formula_id) ->
 *   transformations (source_formula_id). See SCHEMA NOTE below.
 * - No consent value is ever exposed in any API output.
 *
 * SCHEMA NOTE (verified against dashboard/prisma/schema.prisma on main):
 * `formulas` has NO `transformations` relation and NO link to `formulations`,
 * so a literal `formulas: { transformations: { some: ... } }` Prisma filter
 * is not expressible. The only per-formula join to transformations is via
 * `formula_listings`: formulas.formula_listings[] (source_formula_id) and
 * formula_listings.transformations[] (transformations.source_formula_id).
 * That is the join this module and the v1 routes use.
 */

import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const CONSENT_METHODS = ['verbal', 'signed', 'digital'] as const;

/**
 * Strict check on a STORED consent record. Deliberately stricter than
 * lib/transformations.ts validateConsent: validateConsent defaults a missing
 * attested_at to NOW at write time, but a stored record with no (or an
 * unparseable) attested_at must FAIL on read — never default, never guess.
 */
export function hasValidStoredConsent(record: unknown): boolean {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  const r = record as { method?: unknown; attested_at?: unknown };
  if (!(CONSENT_METHODS as readonly unknown[]).includes(r.method)) return false;
  if (typeof r.attested_at !== 'string' || Number.isNaN(Date.parse(r.attested_at))) return false;
  return true;
}

export interface Reader {
  /** JWT user id (users.id), or null when anonymous / auth failed. */
  userId: string | null;
  /** Resolved stylists.id for that user, or null when no stylist row exists. Read-only lookup: never creates. */
  stylistId: string | null;
}

/** Resolve the reader without writing: optional auth + a non-creating stylist lookup. Auth failure degrades to anonymous — never throws. */
export async function resolveReader(req: Request): Promise<Reader> {
  let user: { userId: string } | null = null;
  try {
    user = await getUserFromRequest(req);
  } catch {
    user = null;
  }
  if (!user) return { userId: null, stylistId: null };
  let stylist: { id: string } | null = null;
  try {
    stylist = await prisma.stylists.findUnique({ where: { user_id: user.userId } });
  } catch {
    stylist = null;
  }
  return { userId: user.userId, stylistId: stylist?.id ?? null };
}

/**
 * True when this photo belongs to the reader. Only the stylist-id convention
 * applies here: the photos POST resolves the caller to a stylists.id via
 * getOrCreateStylistForUser and stores THAT as photo.stylist_id, so
 * photo.stylist_id is always a stylists.id, never a users.id.
 */
export function isOwnPhoto(photo: { stylist_id: string }, reader: Reader): boolean {
  return reader.stylistId !== null && photo.stylist_id === reader.stylistId;
}

/** DB-level pre-filter for transformations; hasValidStoredConsent is the authoritative check on top. Ported from pool-reads.ts. */
export const PUBLISHED_TRANSFORMATION_WHERE = {
  status: 'published',
  after_photo_ref: { not: null },
} as const;

/**
 * All transformations reachable from a photo through its formula's listings
 * (photo -> formulas -> formula_listings -> transformations). Expects the
 * formulas include the routes emit; returns [] when the include is absent.
 */
export function collectPhotoTransformations(photo: {
  formulas?: { formula_listings?: Array<{ transformations?: unknown }> } | null;
}): unknown[] {
  const listings = photo?.formulas?.formula_listings;
  if (!Array.isArray(listings)) return [];
  const out: unknown[] = [];
  for (const listing of listings) {
    if (Array.isArray(listing?.transformations)) out.push(...listing.transformations);
  }
  return out;
}

/**
 * True when >=1 transformation on the photo's formula is published, has an
 * after photo, and carries a valid stored consent record. This is the
 * LEGACY stylist-attested basis (see header) — not (b) featuring consent.
 */
export function hasDerivedFeaturingBasis(photo: {
  formulas?: { formula_listings?: Array<{ transformations?: unknown }> } | null;
}): boolean {
  return collectPhotoTransformations(photo).some((t) => {
    if (!t || typeof t !== 'object') return false;
    const tr = t as { status?: unknown; after_photo_ref?: unknown; client_consent?: unknown };
    return (
      tr.status === 'published' &&
      tr.after_photo_ref !== null &&
      tr.after_photo_ref !== undefined &&
      hasValidStoredConsent(tr.client_consent)
    );
  });
}

/** A photo is servable when it is the reader's own OR a featuring basis derives for it. Everything else is excluded — fail closed, no fallback. */
export function isServablePhoto(
  photo: {
    stylist_id: string;
    formulas?: { formula_listings?: Array<{ transformations?: unknown }> } | null;
  },
  reader: Reader,
): boolean {
  return isOwnPhoto(photo, reader) || hasDerivedFeaturingBasis(photo);
}
