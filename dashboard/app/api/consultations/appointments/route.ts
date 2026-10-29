/**
 * POST /api/consultations/appointments — create a minimal appointment record.
 * GET /api/consultations/appointments — list the stylist's appointments.
 *
 * APPOINTMENT TRIGGER (open question, needs Jason's call): COLORiq owns no
 * bookings, so the ONLY trigger item 7 provides is manual stylist creation
 * here (client + scheduled time). This record is a scoping anchor for
 * tokens and reports, NOT a bookings system: no calendar sync, no booking
 * flow, no availability logic. Until Jason rules on the trigger, nothing
 * else creates appointments.
 *
 * Auth: stylist JWT (getUserFromRequest) + salon membership. The client
 * must belong to the stylist's salon, or creation is refused.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { getSalonIdForUser } from '@/lib/stylist';

const createSchema = z.object({
  clientId: z.string().min(1),
  scheduledAt: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'scheduledAt must be an ISO date string'),
});

export async function POST(request: NextRequest) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const salonId = await getSalonIdForUser(authUser.userId);
  if (!salonId) {
    return NextResponse.json({ error: 'Your account isn’t linked to a salon yet.' }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const client = await prisma.clients.findUnique({
    where: { id: parsed.data.clientId },
    select: { salon_id: true },
  });
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  if (client.salon_id !== salonId) {
    return NextResponse.json({ error: 'Client belongs to another salon' }, { status: 403 });
  }
  const appointment = await prisma.consultation_appointments.create({
    data: {
      salonId,
      stylistId: authUser.userId,
      clientId: parsed.data.clientId,
      scheduledAt: new Date(parsed.data.scheduledAt),
      status: 'scheduled',
    },
  });
  return NextResponse.json({ appointment }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const appointments = await prisma.consultation_appointments.findMany({
    where: { stylistId: authUser.userId },
    orderBy: { scheduledAt: 'desc' },
  });
  const ids = appointments.map((a) => a.id);
  const pending =
    ids.length > 0
      ? await prisma.client_reports.findMany({
          where: { appointmentId: { in: ids }, status: 'pending' },
          select: { appointmentId: true },
        })
      : [];
  const counts = new Map<string, number>();
  for (const p of pending) counts.set(p.appointmentId, (counts.get(p.appointmentId) ?? 0) + 1);
  return NextResponse.json({
    appointments: appointments.map((a) => ({ ...a, pendingCount: counts.get(a.id) ?? 0 })),
  });
}
