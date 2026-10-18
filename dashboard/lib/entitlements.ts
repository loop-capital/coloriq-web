import { prisma } from '@/lib/prisma';

/**
 * HARD CLOSE (Jason, 2026-10-17): no product access without a subscription.
 * No free layer. A login alone grants nothing.
 *
 * Access = valid auth AND (active paid subscription OR active grant).
 *
 * Grants are the revocable guest list — founding cohort, team/test, Jason.
 * They live in the `subscriptions` table by convention (no migration):
 *   tier             = 'grant:founding' | 'grant:team' | 'grant:jason'
 *   stripe_*         = null
 *   status           = 'active' | 'revoked' | 'expired'
 * Revocation = set status to 'revoked'. Named via subscriber_id.
 */

export const GRANT_TIERS = ['grant:founding', 'grant:team', 'grant:jason'] as const;
export type GrantTier = (typeof GRANT_TIERS)[number];

export function isGrantTier(tier: string): boolean {
  return tier.startsWith('grant:');
}

/**
 * Does this user have product access? Checks user-level, stylist-level,
 * and salon-level subscriptions/grants with status='active'.
 */
export async function hasProductAccess(userId: string): Promise<boolean> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      salon_id: true,
      stylist: { select: { id: true } },
    },
  });
  if (!user) return false;

  const ors: Array<{ subscriber_type: string; subscriber_id: string }> = [
    { subscriber_type: 'user', subscriber_id: user.id },
  ];
  if (user.salon_id) {
    ors.push({ subscriber_type: 'salon', subscriber_id: user.salon_id });
  }
  if (user.stylist) {
    ors.push({ subscriber_type: 'stylist', subscriber_id: user.stylist.id });
  }

  const row = await prisma.subscriptions.findFirst({
    where: { OR: ors, status: 'active' },
    select: { id: true },
  });
  return !!row;
}

/**
 * Issue a named, revocable grant. For Sienna/Jason ops use.
 */
export async function issueGrant(params: {
  subscriberType: 'user' | 'stylist' | 'salon';
  subscriberId: string;
  tier: GrantTier;
  note?: string;
}) {
  return prisma.subscriptions.create({
    data: {
      subscriber_type: params.subscriberType,
      subscriber_id: params.subscriberId,
      tier: params.tier,
      status: 'active',
      features: params.note ? { note: params.note, issued: new Date().toISOString() } : { issued: new Date().toISOString() },
    },
  });
}

/**
 * Revoke a grant (or cancel a subscription). Access drops on next check.
 */
export async function revokeAccess(subscriptionId: string) {
  return prisma.subscriptions.update({
    where: { id: subscriptionId },
    data: { status: 'revoked', updated_at: new Date() },
  });
}
