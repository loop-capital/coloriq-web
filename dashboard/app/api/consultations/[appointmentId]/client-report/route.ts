/**
 * POST /api/consultations/[appointmentId]/client-report — Door 1 (form),
 * Door 2 (guest chat), and Door 3 (client's own Muse) share this endpoint,
 * this contract, and this pending semantics. One pending write per token;
 * resubmission updates the same pending report (latest submission wins).
 *
 * Fail-closed order: appointment must exist and be 'scheduled' (404/409) →
 * token must validate (401, reason never leaked) → rate limit 10/hour/token
 * (429; attempts count even when field validation later fails, so junk
 * submissions cannot evade the limit by retrying) → fields must validate
 * against the pinned contract (422 with the list) → consents must validate
 * (422). A submission NEVER auto-merges and NEVER overwrites
 * stylist/photo-observed values: it lands PENDING, labeled by channel.
 *
 * Middleware note: /api/consultations/ is public-exempt at the middleware
 * layer (see middleware.ts) ONLY so this route's own token auth can run —
 * exemption is not authorization. Every other handler under this prefix
 * still requires a stylist JWT (see the GET handler below and confirm).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import {
  PINNED_MAP,
  REPORT_CHANNELS,
  validateClientReportFields,
  validateConsents,
  detectConflicts,
  type ReportChannel,
} from '@/lib/consultation/client-report-contract';
import {
  hashToken,
  rateLimitCheck,
  validateTokenRecord,
  type TokenRecord,
} from '@/lib/consultation/client-report-tokens';

const submitSchema = z.object({
  token: z.string().min(1).max(200),
  channel: z.enum(REPORT_CHANNELS as [ReportChannel, ...ReportChannel[]]),
  fields: z.record(z.string(), z.unknown()),
  service_consent: z.boolean(),
  featuring_consent: z.boolean().optional(),
  unknownFields: z.array(z.string()).optional(),
});

function toTokenRecord(row: {
  tokenHash: string;
  appointmentId: string;
  stylistId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  submissionWindowStart: Date | null;
  submissionCount: number;
}): TokenRecord {
  return row;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const { appointmentId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const { token: rawToken, channel, fields, unknownFields } = parsed.data;

  const appointment = await prisma.consultation_appointments.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }
  if (appointment.status !== 'scheduled') {
    return NextResponse.json({ error: 'Appointment is not open for client reports' }, { status: 409 });
  }

  const tokenRow = await prisma.client_report_tokens.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  const tokenCheck = validateTokenRecord(tokenRow ? toTokenRecord(tokenRow) : null, {
    rawToken,
    appointmentId,
    now: new Date(),
  });
  if (!tokenCheck.ok || !tokenRow) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const rl = rateLimitCheck(tokenRow.submissionWindowStart, tokenRow.submissionCount, new Date());
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded (10 submissions per hour per token). Stop and retry later.' },
      { status: 429 },
    );
  }
  try {
    await prisma.client_report_tokens.update({
      where: { id: tokenRow.id },
      data: { submissionWindowStart: rl.nextWindowStart, submissionCount: rl.nextCount },
    });
  } catch {
    return NextResponse.json({ error: 'Rate limit update failed' }, { status: 500 });
  }

  const fieldCheck = validateClientReportFields(fields);
  if (!fieldCheck.ok) {
    return NextResponse.json({ error: 'Invalid fields', fields: fieldCheck.errors }, { status: 422 });
  }
  const consentCheck = validateConsents({
    service_consent: parsed.data.service_consent,
    featuring_consent: parsed.data.featuring_consent,
  });
  if (!consentCheck.ok) {
    return NextResponse.json({ error: 'Invalid consents', fields: consentCheck.errors }, { status: 422 });
  }
  const unknownErrors: string[] = [];
  const unknownSeen = new Set<string>();
  for (const key of unknownFields ?? []) {
    const def = PINNED_MAP.get(key);
    if (!def || def.reportableBy !== 'client') {
      unknownErrors.push(`unknown field not client-reportable: ${key}`);
    } else {
      unknownSeen.add(key);
    }
  }
  if (unknownErrors.length > 0) {
    return NextResponse.json({ error: 'Invalid unknownFields', fields: unknownErrors }, { status: 422 });
  }

  const existing = await prisma.client_reports.findFirst({
    where: { tokenId: tokenRow.id, status: 'pending' },
  });
  const data = {
    fields: fieldCheck.normalized as Prisma.InputJsonValue,
    channel,
    unknownFields: [...unknownSeen],
    serviceConsent: consentCheck.values.serviceConsent,
    featuringConsent: consentCheck.values.featuringConsent,
  };
  if (existing) {
    const updated = await prisma.client_reports.update({
      where: { id: existing.id },
      data,
    });
    return NextResponse.json({ reportId: updated.id, status: 'pending', channel, updated: true });
  }
  const created = await prisma.client_reports.create({
    data: {
      appointmentId,
      tokenId: tokenRow.id,
      stylistId: appointment.stylistId,
      clientId: appointment.clientId,
      status: 'pending',
      ...data,
    },
  });
  return NextResponse.json(
    { reportId: created.id, status: 'pending', channel, updated: false },
    { status: 201 },
  );
}

/**
 * GET review surface (stylist-auth): the appointment's pending reports, the
 * current consultation record (if any), and conflicts between the latest
 * pending report and that record. Conflicts are computed, never resolved,
 * here — resolution happens only in the confirm endpoint.
 */
export async function GET(
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
  const pendingRows = await prisma.client_reports.findMany({
    where: { appointmentId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });
  const record = await prisma.consultation_records.findUnique({
    where: { appointmentId },
  });
  const latest = pendingRows[0];
  const conflicts = latest
    ? detectConflicts(
        latest.fields as Record<string, unknown>,
        (record?.fields as Record<string, unknown> | undefined) ?? {},
      )
    : [];
  return NextResponse.json({
    appointment: {
      id: appointment.id,
      scheduledAt: appointment.scheduledAt.toISOString(),
      status: appointment.status,
      clientId: appointment.clientId,
    },
    // tokenId is internal bookkeeping and is stripped from the review payload.
    pendingReports: pendingRows.map(({ tokenId: _tokenId, ...rest }) => rest),
    consultationRecord: record,
    conflicts,
  });
}
