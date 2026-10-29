/**
 * POST /api/consultations/[appointmentId]/invitation — issue a magic link.
 *
 * Stylist-auth + ownership only. The appointment must be 'scheduled';
 * invitations for completed/cancelled appointments are refused (409).
 *
 * Latest link wins: issuing revokes all prior unexpired tokens for this
 * appointment. The raw token is returned ONCE inside the link path; only its
 * SHA-256 hash is stored (see lib/consultation/client-report-tokens.ts).
 * Expiry = appointment scheduled time + 2-hour grace. The link is returned
 * as a path (/r/<token>); the sending surface prepends the site origin.
 * This endpoint does NOT send email/text — delivery of the link to the
 * client is the caller's job (the Oct 25 design's email/text invitation
 * copy is a separate, unbuilt surface).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import {
  generateRawToken,
  hashToken,
  tokenExpiryFor,
} from '@/lib/consultation/client-report-tokens';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await params;
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const appointment = await prisma.consultation_appointments.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }
  if (appointment.stylistId !== authUser.userId) {
    return NextResponse.json({ error: 'Appointment belongs to another stylist' }, { status: 403 });
  }
  if (appointment.status !== 'scheduled') {
    return NextResponse.json({ error: 'Appointment is not open for invitations' }, { status: 409 });
  }
  await prisma.client_report_tokens.updateMany({
    where: { appointmentId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const rawToken = generateRawToken();
  const token = await prisma.client_report_tokens.create({
    data: {
      appointmentId,
      stylistId: authUser.userId,
      tokenHash: hashToken(rawToken),
      expiresAt: tokenExpiryFor(appointment.scheduledAt),
    },
  });
  return NextResponse.json(
    {
      link: `/r/${rawToken}`,
      expiresAt: token.expiresAt.toISOString(),
      appointmentId,
    },
    { status: 201 },
  );
}
