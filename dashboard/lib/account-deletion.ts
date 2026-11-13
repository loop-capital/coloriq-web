/**
 * Account deletion + account plan state for the authenticated user.
 *
 * Built for Apple Guideline 5.1.1(v) (in-app account deletion), used by
 * DELETE /api/account.
 *
 * SUBSCRIPTIONS FIRST: live Square subscriptions (square_subscription_id
 * set) are canceled at Square BEFORE the database transaction runs — a
 * Square cancel cannot be rolled back, so if it fails the deletion aborts
 * and nothing is deleted (Jason's ruling, 2026-11-12). Never land in
 * "account gone, billing live". The reverse failure (Square canceled, then
 * the transaction fails) leaves the account intact with a canceled
 * subscription — recoverable by resubscribing.
 *
 * The transaction itself: either everything below happens or nothing does.
 *
 * DELETED (personal data, owned solely by this person):
 *   - the `users` row (login identity, email, password hash, Apple ID)
 *     → cascades client_photo_collections; stylists.user_id SetNull
 *   - their community posts (cascades photos/likes/comments on them),
 *     their comments and likes on other posts
 *   - their comments on formulas and formula photos
 *   - their transformations (before/after showcase entries)
 *   - their API keys and webhooks (credentials — revoked by deletion)
 *   - their trend search history
 *
 * RETAINED + DETACHED (rows survive, the person's link to them is cut):
 *   - the `stylists` row: every personal field is scrubbed, it is
 *     deactivated and detached from the user. It must survive because
 *     marketplace listings other salons licensed, creator payouts, and
 *     salon formulation history reference it with NoAction FKs.
 *   - `formulas.stylist_id` (→ users) is set to null; the formula rows are
 *     salon visit history and may be the source of marketplace listings.
 *   - formula photos + photo analyses: RETAINED and detached
 *     (stylist_id → null). The stylist FORFEITS them on deletion — the
 *     rows stay with COLORiq and any future revenue they generate belongs
 *     to COLORiq (Jason's ruling, 2026-11-12).
 *   - consultation history (consent_records, consultation_records,
 *     consultation_appointments, client_report_tokens, client_reports):
 *     NEVER deleted — the stylist reference is set to null, and the
 *     stylist's invitation tokens are revoked (revokedAt = now) so dead
 *     invitations die deliberately instead of lingering until expiry.
 *     The detach runs as typed Prisma updateMany calls inside the
 *     transaction — the stylist columns are nullable in both the
 *     database and the schema (migration 20261112_account_deletion_detach).
 *     Their stylist columns store the stylist's USERS id.
 *
 * PAYOUT NOTE: the marketplace 70/30 ledger keys off
 * formula_listings.creator_id, NOT off formulas/formula_photos
 * stylist_id — nulling those does not by itself redirect creator payouts.
 * The listings still point at the anonymized stylist row, so the 70%
 * keeps accruing to that (dead) creator id in the monthly billing run.
 * No payout settlement exists yet (see billing.ts TODO), so no money
 * moves today — but making the forfeiture true at the money layer needs
 * a follow-up decision: reassign the listings to a COLORiq house creator,
 * deactivate them, or teach billing to treat deactivated creators as
 * platform revenue. Do not claim the revenue is COLORiq's until one of
 * those lands.
 *
 * SUBSCRIPTION ROWS: user- and stylist-level rows are marked canceled
 * (reason 'account_deleted'). Salon-level rows are untouched — a salon can
 * have other members.
 *
 * NOT TOUCHED: the salon and its records (clients, inventory, billing,
 * invoices). Those are business records of the salon, not of this person.
 * Uploaded file blobs referenced by deleted photo rows are not purged
 * from object storage here.
 */

import { prisma as defaultPrisma } from '@/lib/prisma';
import { cancelSquareSubscriptionIfActive, getSquareSubscription, isSquareNotFound } from '@/lib/square';

type Db = typeof defaultPrisma;

export const DELETED_EMAIL_DOMAIN = 'deleted.coloriq.invalid';

export interface DeletionResult {
  deleted: true;
  stylistAnonymized: boolean;
}

/**
 * Cancel every live Square subscription belonging to the user or their
 * stylist profile, before any database row is touched. Salon-level
 * subscriptions are never touched. Rows with no square_subscription_id
 * (grants, already-canceled) are skipped. Throws on any live cancel
 * failure — the caller must abort the deletion.
 *
 * Each subscription is pre-validated (status fetched first) and canceled
 * only while it is live at Square — ACTIVE / PENDING / PAUSED, all three
 * of which can bill, on start or on resume. Subscriptions already
 * terminal (CANCELED / DEACTIVATED / COMPLETED) are skipped. If the
 * status fetch itself fails with a proven 404 the subscription is gone
 * and is skipped; any other fetch failure falls through to attempting
 * the cancel, and the tolerance in cancelSquareSubscriptionIfActive
 * decides (a proven 404 counts as done, anything else aborts).
 *
 * PARTIAL CANCEL: the cancels run sequentially against Square, so if the
 * second cancel throws, the first is already canceled at Square while the
 * account survives. Every canceled (and skipped) id is logged so support
 * can reconcile, and a retry CONVERGES: the already-canceled subscription
 * now reads as terminal and is skipped, the remaining ones are canceled,
 * and the deletion proceeds.
 */
async function cancelLiveSquareSubscriptions(
  userId: string,
  stylistId: string | null,
  db: Db,
): Promise<void> {
  const rows = await db.subscriptions.findMany({
    where: {
      OR: [
        { subscriber_type: 'user', subscriber_id: userId },
        ...(stylistId ? [{ subscriber_type: 'stylist', subscriber_id: stylistId }] : []),
      ],
      status: { notIn: ['canceled', 'revoked', 'expired'] },
      square_subscription_id: { not: null },
    },
    select: { square_subscription_id: true },
  });
  for (const row of rows) {
    const id = row.square_subscription_id;
    if (!id) continue;
    // Pre-validate: skip subscriptions already dead at Square.
    let status: string | undefined;
    try {
      status = (await getSquareSubscription(id))?.status;
    } catch (err) {
      if (isSquareNotFound(err)) {
        console.log(`[account-deletion] Square subscription ${id} already gone at Square; skipping cancel for user ${userId}`);
        continue;
      }
      // Status unknown — attempt the cancel and let the tolerance logic decide.
    }
    if (status === 'CANCELED' || status === 'DEACTIVATED' || status === 'COMPLETED') {
      console.log(`[account-deletion] Square subscription ${id} already ${status}; skipping cancel for user ${userId}`);
      continue;
    }
    await cancelSquareSubscriptionIfActive(id);
    console.log(`[account-deletion] canceled Square subscription ${id} for user ${userId}`);
  }
}

export async function deleteAccount(userId: string, db: Db = defaultPrisma): Promise<DeletionResult | null> {
  // Resolve the person FIRST, outside the transaction: the Square cancel
  // below needs the ids, and a Square cancel cannot be rolled back.
  const user = await db.users.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return null;
  const stylist = await db.stylists.findUnique({ where: { user_id: userId }, select: { id: true } });

  // Cancel live Square billing BEFORE anything is deleted. If this throws,
  // the deletion aborts here — the account stays and nothing is deleted.
  await cancelLiveSquareSubscriptions(userId, stylist?.id ?? null, db);

  return db.$transaction(async (tx) => {
    const now = new Date();

    // Ids this person may appear under in soft-reference columns (some
    // routes store users.id, others stylists.id).
    const personIds = stylist ? [userId, stylist.id] : [userId];
    // The Nov 10 consultation tables store the stylist's USERS id in
    // their stylist columns; match both ids so no row is left pointing
    // at the deleted user.
    const stylistRef = stylist ? stylist.id : userId;

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
      // RETAINED + DETACHED (Jason's ruling, 2026-11-12): formula photos
      // and photo analyses stay with COLORiq — the stylist forfeits them
      // and any future revenue they generate. Same pattern as formulas.
      await tx.formula_photos.updateMany({ where: { stylist_id: sid }, data: { stylist_id: null } });
      await tx.photo_analyses.updateMany({ where: { stylist_id: sid }, data: { stylist_id: null } });
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

    // Consultation history (Nov 10 tables): detach the stylist reference,
    // NEVER delete the rows — clients' consultation history must survive.
    // The stylist columns are nullable in the schema (migration
    // 20261112_account_deletion_detach), so this runs as typed Prisma
    // updateMany calls inside the transaction — same statements, same
    // transaction, no raw SQL. The token revoke rides in the SAME
    // updateMany as the token detach: the old raw-SQL sequence nulled
    // stylistId first and then revoked WHERE stylistId matched, which
    // matched zero rows — the revoke never happened.
    await tx.consent_records.updateMany({
      where: { stylist_id: { in: [userId, stylistRef] } },
      data: { stylist_id: null },
    });
    await tx.consultation_appointments.updateMany({
      where: { stylistId: { in: [userId, stylistRef] } },
      data: { stylistId: null },
    });
    await tx.consultation_records.updateMany({
      where: { stylistId: { in: [userId, stylistRef] } },
      data: { stylistId: null },
    });
    // CONCERN 4: the confirm route writes confirmedBy into BOTH
    // consultation_records and client_reports — detach both.
    await tx.consultation_records.updateMany({
      where: { confirmedBy: { in: [userId, stylistRef] } },
      data: { confirmedBy: null },
    });
    // Revoke the deleted stylist's invitations in the same statement as
    // the detach, so the revoke actually lands on the detached rows.
    await tx.client_report_tokens.updateMany({
      where: { stylistId: { in: [userId, stylistRef] } },
      data: { stylistId: null, revokedAt: now },
    });
    await tx.client_reports.updateMany({
      where: { stylistId: { in: [userId, stylistRef] } },
      data: { stylistId: null },
    });
    await tx.client_reports.updateMany({
      where: { confirmedBy: { in: [userId, stylistRef] } },
      data: { confirmedBy: null },
    });

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
