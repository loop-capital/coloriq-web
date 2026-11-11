/**
 * Server-side hub-link validation shared by the form door and the guest-chat
 * door (Phase 1 item 7). A hub page renders its door ONLY when this returns
 * ok; otherwise it renders an invalid/expired message and no form, no data.
 * The token is the only credential here — it is validated by hash, expiry,
 * revocation, and appointment status before anything client-specific is
 * shown. Display names fall back to generics when a lookup misses, so a
 * missing stylist row can never break the door.
 */

import { prisma } from '@/lib/prisma';
import { hashToken } from './client-report-tokens';

export interface HubLinkValid {
  ok: true;
  appointmentId: string;
  clientName: string;
  stylistName: string;
  scheduledAt: string;
}

export type HubLinkResult = HubLinkValid | { ok: false };

export async function validateHubToken(rawToken: string): Promise<HubLinkResult> {
  const row = await prisma.client_report_tokens.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!row || row.revokedAt || new Date() > row.expiresAt) return { ok: false };
  const appt = await prisma.consultation_appointments.findUnique({
    where: { id: row.appointmentId },
  });
  if (!appt || appt.status !== 'scheduled') return { ok: false };
  const client = await prisma.clients.findUnique({
    where: { id: appt.clientId },
    select: { first_name: true },
  });
  const stylist = await prisma.stylists.findUnique({
    where: { id: appt.stylistId },
    select: { first_name: true, display_name: true },
  });
  return {
    ok: true,
    appointmentId: appt.id,
    clientName: client?.first_name ?? 'there',
    stylistName: stylist?.display_name ?? stylist?.first_name ?? 'your stylist',
    scheduledAt: appt.scheduledAt.toISOString(),
  };
}
