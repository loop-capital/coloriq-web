/**
 * Account deletion + account plan state for the authenticated user.
 *
 * Built for Apple Guideline 5.1.1(v) (in-app account deletion), used by
 * DELETE /api/account. Runs in one transaction: either everything below
 * happens or nothing does.
 *
 * DELETED (personal data, owned solely by this person):
 *   - the `users` row (login identity, email, password hash, Apple ID)
 *     → cascades client_photo_collections; stylists.user_id SetNull
 *   - their community posts (cascades photos/likes/comments on them),
 *     their comments and likes on other posts
 *   - their formula photos (cascades votes/tags/comments/collections),
 *     their comments on formulas and formula photos
 *   - their photo analyses (cascades extractions/segmentations/textures)
 *   - their transformations (before/after showcase entries)
 *   - their API keys and webhooks (credentials — revoked by deletion)
 *   - their trend search history
 *
 * ANONYMIZED, NOT DELETED (row kept so other parties' records stay intact):
 *   - the `stylists` row: every personal field is scrubbed, it is
 *     deactivated and detached from the user. It must survive because
 *     marketplace listings other salons licensed, creator payouts, and
 *     salon formulation history reference it with NoAction FKs.
 *   - `formulas.stylist_id` (→ users) is set to null; the formula rows are
 *     salon visit history and may be the source of marketplace listings.
 *
 * SUBSCRIPTIONS: user- and stylist-level rows are marked canceled
 * (reason 'account_deleted'). Salon-level rows are untouched — a salon can
 * have other members. No payment provider is called from here; a live
 * Square subscription (square_subscription_id set) is NOT canceled on the
 * Square side by this function.
 *
 * NOT TOUCHED: the salon and its records (clients, inventory, billing,
 * invoices). Those are business records of the salon, not of this person.
 * Uploaded file blobs referenced by deleted photo rows are not purged
 * from object storage here.
 */

import { prisma as defaultPrisma } from '@/lib/prisma';

type Db = typeof defaultPrisma;

export const DELETED_EMAIL_DOMAIN = 'deleted.coloriq.invalid';

export interface DeletionResult {
  deleted: true;
  stylistAnonymized: boolean;
}

export async function deleteAccount(userId: string, db: Db = defaultPrisma): Promise<DeletionResult | null> {
  return db.$transaction(async (tx) => {
    const user = await tx.users.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return null;

    const stylist = await tx.stylists.findUnique({ where: { user_id: userId }, select: { id: true } });
    const now = new Date();

    // Ids this person may appear under in soft-reference columns (some
    // routes store users.id, others stylists.id).
    const personIds = stylist ? [userId, stylist.id] : [userId];

    await tx.formula_comments.deleteMany({ where: { author_id: { in: personIds } } });
    await tx.formula_photo_comments.deleteMany({ where: { author_id: { in: personIds } } });
    await tx.trend_searches.deleteMany({ where: { user_id: { in: personIds } } });
    await tx.webhooks.deleteMany({ where: { owner_id: { in: personIds }, owner_type: { in: ['user', 'stylist'] } } });

    await tx.subscriptions.updateMany({
      where: {
        OR: [
          { subscriber_type: 'user', subscriber_id: userId },
          ...(stylist ? [{ subscriber_type: 'stylist', subscriber_id: stylist.id }] : []),
        ],
        status: { notIn: ['canceled', 'revoked', 'expired'] },
      },
      data: { status: 'canceled', canceled_at: now, cancellation_reason: 'account_deleted', updated_at: now },
    });

    if (stylist) {
      const sid = stylist.id;
      await tx.post_likes.deleteMany({ where: { user_id: sid } });
      await tx.post_comments.deleteMany({ where: { author_id: sid } });
      await tx.community_posts.deleteMany({ where: { stylist_id: sid } });
      await tx.transformations.deleteMany({ where: { stylist_id: sid } });
      await tx.formula_photos.deleteMany({ where: { stylist_id: sid } });
      await tx.photo_analyses.deleteMany({ where: { stylist_id: sid } });
      await tx.api_keys.deleteMany({
        where: { OR: [{ created_by: sid }, { owner_type: 'stylist', owner_id: sid }] },
      });

      await tx.stylists.update({
        where: { id: sid },
        data: {
          email: `deleted-${sid}@${DELETED_EMAIL_DOMAIN}`,
          password_hash: '!account-deleted',
          first_name: 'Deleted',
          last_name: 'User',
          display_name: null,
          license_number: null,
          license_state: null,
          license_expiry: null,
          certifications: [],
          preferences: {},
          avatar_url: null,
          bio: null,
          instagram_handle: null,
          tiktok_handle: null,
          website_url: null,
          byondu_profile_url: null,
          badges: [],
          handle: null,
          location: null,
          salon_name: null,
          specialties: [],
          portal_enabled: false,
          portal_privacy: 'private',
          is_active: false,
          user_id: null,
          updated_at: now,
        },
      });
    }

    await tx.formulas.updateMany({ where: { stylist_id: userId }, data: { stylist_id: null } });
    await tx.users.delete({ where: { id: userId } });

    return { deleted: true as const, stylistAnonymized: !!stylist };
  });
}

// ─── Plan state (read-only) ─────────────────────────────────────────────

export interface AccountPlanState {
  hasAccess: boolean;
  /** Raw tier of the most relevant subscription/grant row, or null. */
  tier: string | null;
  /** Human label, e.g. "Pro" or "Complimentary access". */
  label: string | null;
  status: string | null;
  /** 'user' | 'stylist' | 'salon' — whose subscription this is. */
  scope: string | null;
  currentPeriodEnd: string | null;
}

export function planLabel(tier: string | null): string | null {
  if (!tier) return null;
  if (tier.startsWith('grant:')) return 'Complimentary access';
  return tier
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Same subscriber resolution as lib/entitlements.hasProductAccess
 * (user, stylist and salon rows). Prefers an active row; otherwise reports
 * the most recent row so the app can say e.g. "canceled".
 */
export async function getAccountPlanState(userId: string, db: Db = defaultPrisma): Promise<AccountPlanState> {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { id: true, salon_id: true, stylist: { select: { id: true } } },
  });
  const empty: AccountPlanState = {
    hasAccess: false, tier: null, label: null, status: null, scope: null, currentPeriodEnd: null,
  };
  if (!user) return empty;

  const ors: Array<{ subscriber_type: string; subscriber_id: string }> = [
    { subscriber_type: 'user', subscriber_id: user.id },
  ];
  if (user.salon_id) ors.push({ subscriber_type: 'salon', subscriber_id: user.salon_id });
  if (user.stylist) ors.push({ subscriber_type: 'stylist', subscriber_id: user.stylist.id });

  const active = await db.subscriptions.findFirst({
    where: { OR: ors, status: 'active' },
    orderBy: { created_at: 'desc' },
  });
  const row = active ?? (await db.subscriptions.findFirst({ where: { OR: ors }, orderBy: { created_at: 'desc' } }));
  if (!row) return empty;

  return {
    hasAccess: !!active,
    tier: row.tier,
    label: planLabel(row.tier),
    status: row.status ?? null,
    scope: row.subscriber_type,
    currentPeriodEnd: row.current_period_end ? row.current_period_end.toISOString() : null,
  };
}
