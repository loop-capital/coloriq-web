/**
 * Card on file for monthly per-use formula license billing.
 *
 * GET    — status: does this salon have a card on file yet?
 * POST   — start setup: creates a Square Customer for the salon (if needed)
 *          and a real $1.00 verification checkout. Square can't save a card
 *          without a real payment going through, so this is a genuine
 *          small charge, not a no-op — the buyer sees exactly that on the
 *          hosted checkout page. Once paid, the webhook (payment.updated
 *          with referenceId "bs:<salonId>") fetches the card
 *          Square saved against the customer and stores it here.
 * DELETE — forget the card on file (salon can redo setup with a different card).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { getSalonIdForUser } from '@/lib/stylist';
import { createSquareCustomer, createPaymentLink } from '@/lib/square';

const VERIFICATION_CHARGE_CENTS = 100; // $1.00 — the smallest real charge Square will process

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }
  const salonId = await getSalonIdForUser(user.userId);
  if (!salonId) {
    return NextResponse.json({ success: false, error: { code: 'NO_SALON' } }, { status: 400 });
  }

  const salon = await prisma.salons.findUnique({
    where: { id: salonId },
    select: { square_card_id: true, billing_card_last4: true, billing_card_brand: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      has_card_on_file: !!salon?.square_card_id,
      card_last4: salon?.billing_card_last4 || null,
      card_brand: salon?.billing_card_brand || null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
    }
    const salonId = await getSalonIdForUser(user.userId);
    if (!salonId) {
      return NextResponse.json({ success: false, error: { code: 'NO_SALON' } }, { status: 400 });
    }

    const salon = await prisma.salons.findUnique({ where: { id: salonId } });
    if (!salon) {
      return NextResponse.json({ success: false, error: { code: 'SALON_NOT_FOUND' } }, { status: 404 });
    }

    let squareCustomerId = salon.square_customer_id;
    if (!squareCustomerId) {
      const authedUser = await prisma.users.findUnique({ where: { id: user.userId } });
      const customer = await createSquareCustomer({
        email: salon.email || authedUser?.email || '',
        givenName: salon.name,
        referenceId: salonId,
      });
      if (!customer?.id) {
        throw new Error('Square did not return a customer id');
      }
      squareCustomerId = customer.id;
      await prisma.salons.update({ where: { id: salonId }, data: { square_customer_id: squareCustomerId } });
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'https://getCOLORiq.co';
    const paymentLink = await createPaymentLink({
      referenceId: `bs:${salonId}`,
      name: 'Card verification for formula license billing',
      amountCents: VERIFICATION_CHARGE_CENTS,
      redirectUrl: `${appBaseUrl}/settings?billing_setup=complete`,
      note: 'ColorIq formula license billing — card verification',
    });

    if (!paymentLink?.url) {
      throw new Error('Square did not return a checkout URL');
    }

    return NextResponse.json({
      success: true,
      data: {
        checkout_url: paymentLink.url,
        verification_charge_cents: VERIFICATION_CHARGE_CENTS,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start billing setup';
    return NextResponse.json({ success: false, error: { code: 'SETUP_FAILED', message } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }
  const salonId = await getSalonIdForUser(user.userId);
  if (!salonId) {
    return NextResponse.json({ success: false, error: { code: 'NO_SALON' } }, { status: 400 });
  }

  await prisma.salons.update({
    where: { id: salonId },
    data: { square_card_id: null, billing_card_last4: null, billing_card_brand: null },
  });

  return NextResponse.json({ success: true });
}
