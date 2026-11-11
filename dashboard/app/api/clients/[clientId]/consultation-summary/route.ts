/**
 * GET /api/clients/[clientId]/consultation-summary — profile-summary feed.
 *
 * Repeat-letter seam 1 (beta plan §5.1): the cadence job pulls the client's
 * latest stylist-CONFIRMED consultation record per client — to fill the
 * repeat letter's read-back AND to decide which letter the client gets
 * (confirmed profile on file -> repeat letter; none -> full letter).
 *
 * Auth: stylist JWT + salon membership. The client must belong to the
 * stylist's salon, or the read is refused (404 unknown client, 403 another
 * salon's client). Behind the hard close like every other /api route.
 *
 * Response: { clientId, hasConfirmedProfile, summary } where summary is
 * null when there is no confirmed record, else the confirmed fields plus
 * the consent answers from the confirmed report (see
 * lib/consultation/client-summary.ts for the shape).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { getSalonIdForUser } from '@/lib/stylist';
import { buildClientSummary } from '@/lib/consultation/client-summary';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const salonId = await getSalonIdForUser(authUser.userId);
  if (!salonId) {
    return NextResponse.json({ error: 'Your account isn’t linked to a salon yet.' }, { status: 400 });
  }
  const client = await prisma.clients.findUnique({
    where: { id: clientId },
    select: { salon_id: true },
  });
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  if (client.salon_id !== salonId) {
    return NextResponse.json({ error: 'Client belongs to another salon' }, { status: 403 });
  }
  const record = await prisma.consultation_records.findFirst({
    where: { clientId },
    orderBy: [{ confirmedAt: 'desc' }, { createdAt: 'desc' }],
  });
  if (!record) {
    return NextResponse.json({ clientId, hasConfirmedProfile: false, summary: null });
  }
  const report = record.confirmedReportId
    ? await prisma.client_reports.findUnique({
        where: { id: record.confirmedReportId },
        select: { serviceConsent: true, featuringConsent: true },
      })
    : await prisma.client_reports.findFirst({
        where: { clientId, status: 'confirmed' },
        orderBy: [{ confirmedAt: 'desc' }, { createdAt: 'desc' }],
        select: { serviceConsent: true, featuringConsent: true },
      });
  return NextResponse.json({
    clientId,
    hasConfirmedProfile: true,
    summary: buildClientSummary(record, report),
  });
}
