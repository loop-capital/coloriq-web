/**
 * Monthly per-use formula license billing — the actual logic, shared by
 * POST /api/marketplace/billing (on-demand, self or admin-triggered) and
 * the monthly cron (app/api/cron/formula-billing). Lives outside any
 * route.ts because Next.js route files may only export HTTP method
 * handlers (and a few config exports) — an extra named export there breaks
 * its generated route-type validation.
 */

import { prisma } from '@/lib/prisma';
import { createSquarePayment } from '@/lib/square';
import { BillingLineItem } from '@/lib/api/types';

const CREATOR_SHARE_PCT = 70;

export async function billSalonForPeriod(
  salonId: string,
  period: string
): Promise<
  | { success: true; invoice: unknown }
  | { success: false; error: { code: string; message: string }; status: number }
> {
  const existing = await prisma.formula_billing_invoices.findUnique({
    where: { salon_id_billing_period: { salon_id: salonId, billing_period: period } },
  });
  if (existing) {
    return { success: false, error: { code: 'ALREADY_BILLED', message: `Already billed for ${period}` }, status: 400 };
  }

  const [year, month] = period.split('-').map(Number);
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));

  const periodEvents = await prisma.formula_usage_log.findMany({
    where: {
      salonId,
      billingInvoiceId: null,
      usedAt: { gte: periodStart, lt: periodEnd },
    },
    include: { listing: { select: { id: true, title: true, tier: true, creator_id: true } } },
  });

  const billable = periodEvents.filter((e) => Number(e.feeAmount) > 0);

  // Voice assistant cost — no creator split (100% platform pass-through),
  // billed alongside formula usage on the same monthly invoice/charge
  // rather than a separate one, so a salon gets one bill, not two.
  const voiceAssistantEvents = await prisma.voice_assistant_usage.findMany({
    where: { salon_id: salonId, billing_invoice_id: null, created_at: { gte: periodStart, lt: periodEnd } },
  });
  const voiceAssistantCents = Math.round(
    voiceAssistantEvents.reduce((sum, e) => sum + Number(e.cost_cents), 0)
  );

  if (billable.length === 0 && voiceAssistantEvents.length === 0) {
    return { success: false, error: { code: 'NO_USAGE', message: 'No unbilled usage found for this period' }, status: 400 };
  }

  const byFormula = new Map<string, { title: string; tier: string; creator_id: string; count: number; feeCents: number }>();
  for (const e of billable) {
    const key = e.formulaId;
    const feeCents = Math.round(Number(e.feeAmount) * 100);
    const agg = byFormula.get(key);
    if (agg) {
      agg.count += 1;
    } else {
      byFormula.set(key, { title: e.listing.title, tier: e.listing.tier, creator_id: e.listing.creator_id, count: 1, feeCents });
    }
  }

  const lineItems: BillingLineItem[] = [];
  let totalCents = 0;
  for (const [formulaId, agg] of byFormula) {
    const lineTotal = agg.feeCents * agg.count;
    const creatorEarnings = Math.round(lineTotal * (CREATOR_SHARE_PCT / 100));
    const platformFee = lineTotal - creatorEarnings;
    lineItems.push({
      formula_id: formulaId,
      formula_title: agg.title,
      creator_id: agg.creator_id,
      tier: agg.tier,
      use_count: agg.count,
      per_use_cents: agg.feeCents,
      total_cents: lineTotal,
      creator_earnings_cents: creatorEarnings,
      platform_fee_cents: platformFee,
    });
    totalCents += lineTotal;
  }

  const totalCreatorEarnings = lineItems.reduce((sum, l) => sum + l.creator_earnings_cents, 0);
  const totalPlatformFee = lineItems.reduce((sum, l) => sum + l.platform_fee_cents, 0);
  const combinedTotalCents = totalCents + voiceAssistantCents;

  // Only possible when there's no formula usage and voice-assistant cost
  // for the period is real but rounds to less than a cent (e.g. one or two
  // questions) — leave those usage rows unbilled so they roll forward and
  // accumulate with next month's, rather than creating an invoice and
  // attempting an actual $0.00 Square charge.
  if (combinedTotalCents <= 0) {
    return { success: false, error: { code: 'NO_USAGE', message: 'Unbilled usage this period rounds to less than a cent — carried to next month' }, status: 400 };
  }

  const salon = await prisma.salons.findUnique({
    where: { id: salonId },
    select: { square_customer_id: true, square_card_id: true },
  });
  if (!salon?.square_card_id) {
    return {
      success: false,
      error: { code: 'NO_CARD_ON_FILE', message: 'This salon has no card on file — add one in Settings before billing can run' },
      status: 402,
    };
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.formula_billing_invoices.create({
      data: {
        salon_id: salonId,
        billing_period: period,
        total_cents: combinedTotalCents,
        total_creator_earnings_cents: totalCreatorEarnings,
        total_platform_fee_cents: totalPlatformFee,
        voice_assistant_cents: voiceAssistantCents,
        line_items: lineItems as any,
        status: 'pending',
      },
    });
    if (billable.length > 0) {
      await tx.formula_usage_log.updateMany({
        where: { id: { in: billable.map((e) => e.id) } },
        data: { billingInvoiceId: inv.id },
      });
    }
    if (voiceAssistantEvents.length > 0) {
      await tx.voice_assistant_usage.updateMany({
        where: { id: { in: voiceAssistantEvents.map((e) => e.id) } },
        data: { billing_invoice_id: inv.id },
      });
    }
    return inv;
  });

  // The actual charge — this was the commented-out TODO. Failure here
  // doesn't unwind the invoice; it's recorded as failed so it can be
  // retried (the usage events stay linked to this invoice, not re-billed
  // as if they were still pending).
  try {
    const payment = await createSquarePayment({
      sourceId: salon.square_card_id,
      customerId: salon.square_customer_id || undefined,
      amountCents: combinedTotalCents,
      note: `ColorIq formula licenses — ${period}`,
    });

    const updated = await prisma.formula_billing_invoices.update({
      where: { id: invoice.id },
      data: {
        status: payment?.status === 'COMPLETED' ? 'paid' : 'failed',
        paid_at: payment?.status === 'COMPLETED' ? new Date() : null,
        square_payment_id: payment?.id,
        failure_reason: payment?.status === 'COMPLETED' ? null : `Square status: ${payment?.status}`,
      },
    });

    // TODO: creator payouts (paying the 70% share OUT to each creator) is a
    // separate, larger problem — it needs each creator to have their own
    // connected payout destination, not just the salon's card on file that
    // pays IN. Not fabricated here; flagged same as before.

    return { success: true, invoice: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Square charge failed';
    const updated = await prisma.formula_billing_invoices.update({
      where: { id: invoice.id },
      data: { status: 'failed', failure_reason: message },
    });
    return { success: true, invoice: updated }; // invoice exists and is queryable even though the charge failed
  }
}
