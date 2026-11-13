// =====================================================
// SQUARE PAYMENT INTEGRATION
// Cost-plus pricing with Square (SDK v44)
// =====================================================

import { SquareClient, SquareEnvironment } from 'square';

// ── Square Client ──
const token = process.env.SQUARE_ACCESS_TOKEN || '';
const environment = process.env.SQUARE_ENVIRONMENT === 'production'
  ? SquareEnvironment.Production
  : SquareEnvironment.Sandbox;

export const squareClient = new SquareClient({
  token,
  environment,
});

// ── Subscription Tiers → Square Catalog Mapping ──
// These IDs will be populated after creating catalog items in Square Dashboard
export const SQUARE_CATALOG_ITEM_IDS: Record<string, string> = {
  solo: process.env.SQUARE_SOLO_ITEM_ID || 'PLACEHOLDER_SOLO',
  salon_small: process.env.SQUARE_SALON_SMALL_ITEM_ID || 'PLACEHOLDER_SALON_SMALL',
  salon_medium: process.env.SQUARE_SALON_MEDIUM_ITEM_ID || 'PLACEHOLDER_SALON_MEDIUM',
  salon_large: process.env.SQUARE_SALON_LARGE_ITEM_ID || 'PLACEHOLDER_SALON_LARGE',
  extra_line: process.env.SQUARE_EXTRA_LINE_ITEM_ID || 'PLACEHOLDER_EXTRA_LINE',
};

// ── Create Customer ──
export async function createSquareCustomer(params: {
  email: string;
  givenName: string;
  familyName?: string;
  phone?: string;
  referenceId: string; // Our user ID
}) {
  const idempotencyKey = crypto.randomUUID();

  const response = await squareClient.customers.create({
    idempotencyKey,
    emailAddress: params.email,
    givenName: params.givenName,
    familyName: params.familyName,
    phoneNumber: params.phone,
    referenceId: params.referenceId,
  });

  return response.customer;
}

// ── Create Subscription ──
export async function createSquareSubscription(params: {
  customerId: string;
  planId: string; // Square subscription plan ID
  startDate?: string; // ISO date, defaults to now
}) {
  const idempotencyKey = crypto.randomUUID();

  const response = await squareClient.subscriptions.create({
    idempotencyKey,
    locationId: process.env.SQUARE_LOCATION_ID || '',
    customerId: params.customerId,
    planVariationId: params.planId,
    startDate: params.startDate,
    timezone: 'America/New_York',
  });

  return response.subscription;
}

// ── Cancel Subscription ──
export async function cancelSquareSubscription(subscriptionId: string) {
  const response = await squareClient.subscriptions.cancel({
    subscriptionId,
  });
  return response.subscription;
}

// ── Get Subscription ──
export async function getSquareSubscription(subscriptionId: string) {
  const response = await squareClient.subscriptions.get({ subscriptionId });
  return response.subscription;
}

// ── Cancel Subscription (tolerant) ──
// Cancel, tolerating a subscription that is already dead at Square: Square
// errors on canceling a CANCELED subscription, so on error we re-fetch —
// a CANCELED / DEACTIVATED / COMPLETED subscription, or one Square no
// longer knows, is not billing anyone and counts as done. Any other
// failure rethrows: the caller must abort rather than leave billing live.
//
// The re-fetch is the dangerous step: a network outage, DNS failure,
// Square 5xx, 429, or a 401 from a bad SQUARE_ACCESS_TOKEN must NEVER be
// read as "the subscription is dead". Only a PROVEN 404/not-found on the
// re-fetch counts as done — everything else rethrows the original error.
/**
 * True only for a proven Square not-found: HTTP 404, or a Square error
 * body carrying code NOT_FOUND. Duck-typed (no instanceof) so it works
 * with the real SDK error and with plain-object errors in tests.
 */
export function isSquareNotFound(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { statusCode?: unknown; errors?: unknown };
  if (e.statusCode === 404) return true;
  if (Array.isArray(e.errors)) {
    return e.errors.some(
      (x) => typeof x === 'object' && x !== null && (x as { code?: unknown }).code === 'NOT_FOUND',
    );
  }
  return false;
}

export async function cancelSquareSubscriptionIfActive(subscriptionId: string): Promise<void> {
  try {
    await cancelSquareSubscription(subscriptionId);
    return;
  } catch (err) {
    let sub: Awaited<ReturnType<typeof getSquareSubscription>>;
    try {
      sub = await getSquareSubscription(subscriptionId);
    } catch (refetchErr) {
      if (isSquareNotFound(refetchErr)) return;
      throw err;
    }
    if (!sub) throw err;
    if (sub.status === 'CANCELED' || sub.status === 'DEACTIVATED' || sub.status === 'COMPLETED') return;
    throw err;
  }
}

// ── Get Customer ──
export async function getSquareCustomer(customerId: string) {
  const response = await squareClient.customers.get({ customerId });
  return response.customer;
}

// ── List Customer Cards ──
export async function listCustomerCards(customerId: string) {
  const response = await squareClient.cards.list({ customerId });
  return response.data;
}

// ── Create Payment (one-time) ──
export async function createSquarePayment(params: {
  sourceId: string; // card on file or nonce
  amountCents: number;
  customerId?: string;
  note?: string;
}) {
  const idempotencyKey = crypto.randomUUID();

  const response = await squareClient.payments.create({
    idempotencyKey,
    sourceId: params.sourceId,
    amountMoney: {
      amount: BigInt(params.amountCents),
      currency: 'USD',
    },
    customerId: params.customerId,
    note: params.note,
    autocomplete: true,
  });

  return response.payment;
}

// ── Create Payment Link (hosted checkout) ──
// The real "let a buyer pay us" mechanism for both marketplace formula
// purchases and (once catalog subscription plans exist) subscriptions —
// avoids embedding Square's card-tokenization SDK in either the web
// dashboard or the Expo mobile app. Square hosts the payment page; we get a
// URL to redirect the buyer to and confirm the charge via webhook
// afterward, never trusting the redirect alone as proof of payment.
export async function createPaymentLink(params: {
  referenceId: string; // our own row's id — read back via the order on webhook
  name: string;
  amountCents: number;
  redirectUrl: string;
  note?: string;
}) {
  const idempotencyKey = crypto.randomUUID();
  const locationId = process.env.SQUARE_LOCATION_ID || '';

  const response = await squareClient.checkout.paymentLinks.create({
    idempotencyKey,
    order: {
      locationId,
      referenceId: params.referenceId,
      lineItems: [
        {
          name: params.name,
          quantity: '1',
          basePriceMoney: { amount: BigInt(params.amountCents), currency: 'USD' },
        },
      ],
    },
    checkoutOptions: {
      redirectUrl: params.redirectUrl,
    },
    paymentNote: params.note,
  });

  return response.paymentLink;
}

// ── Inventory Counts ──
export async function getInventoryCounts(catalogObjectIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!catalogObjectIds.length) return counts;
  const response = await squareClient.inventory.batchGetCounts({ catalogObjectIds });
  for (const count of response.data ?? []) {
    if (count.catalogObjectId) {
      counts.set(count.catalogObjectId, Number(count.quantity ?? 0));
    }
  }
  return counts;
}

// ── Verify Webhook Signature ──
import { WebhooksHelper } from 'square';

export async function verifySquareWebhookSignature(
  signature: string,
  body: string,
  url: string
): Promise<boolean> {
  try {
    const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '';
    return await WebhooksHelper.verifySignature({
      requestBody: body,
      signatureHeader: signature,
      signatureKey: key,
      notificationUrl: url,
    });
  } catch {
    return false;
  }
}
