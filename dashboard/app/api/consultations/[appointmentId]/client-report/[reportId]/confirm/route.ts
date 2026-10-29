/**
 * POST /api/consultations/[appointmentId]/client-report/[reportId]/confirm
 * — voice-confirm merge (part c).
 *
 * Stylist-auth + ownership only. The report must be PENDING; confirming a
 * confirmed report is a 409. The stylist submits resolvedFields — the
 * per-field resolution of the pending report against the current record.
 * Voice path: the stylist dictates in the review UI via the existing
 * POST /api/consultation/dictate tool, whose returned updates feed
 * resolvedFields; the confirm itself is ALWAYS an explicit stylist action.
 * Voice never auto-confirms — a dictate transcript alone confirms nothing.
 *
 * Fail-closed on conflicts: every conflict key (pending value vs current
 * record value, both present and different) must appear in resolvedFields,
 * or confirmation is refused with the unresolved list. Silence never keeps
 * or adopts a value by default — omission of a conflict key is a refusal,
 * not a resolution. Non-conflict keys need not be re-submitted: untouched
 * current values are preserved by the merge.
 *
 * Allergies are recorded, never interpreted: resolved allergy values are
 * copied verbatim into the consultation record (see the contract header).
 * This endpoint does NOT write client_allergies rows — allergy records are
 * the stylist's clinical flow, not a side effect of a merge.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import {
  applyMerge,
  detectConflicts,
  validateMergeFields,
} from '@/lib/consultation/client-report-contract';

const confirmSchema = z.object({
  resolvedFields: z.record(z.string(), z.unknown()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string; reportId: string }> },
) {
  const { appointmentId, reportId } = await params;
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
  const report = await prisma.client_reports.findUnique({ where: { id: reportId } });
  if (!report || report.appointmentId !== appointmentId) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
  if (report.status !== 'pending') {
    return NextResponse.json({ error: 'Report is not pending' }, { status: 409 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const mergeCheck = validateMergeFields(parsed.data.resolvedFields);
  if (!mergeCheck.ok) {
    return NextResponse.json({ error: 'Invalid resolvedFields', fields: mergeCheck.errors }, { status: 422 });
  }
  const record = await prisma.consultation_records.findUnique({
    where: { appointmentId },
  });
  const current = (record?.fields as Record<string, unknown> | undefined) ?? {};
  const conflicts = detectConflicts(
    report.fields as Record<string, unknown>,
    current,
  );
  const unresolved = conflicts
    .filter((c) => !Object.prototype.hasOwnProperty.call(mergeCheck.normalized, c.key))
    .map((c) => c.key);
  if (unresolved.length > 0) {
    return NextResponse.json(
      { error: 'Unresolved conflicts', conflicts: unresolved },
      { status: 422 },
    );
  }
  const merged = applyMerge(current, mergeCheck.normalized) as Prisma.InputJsonValue;
  const now = new Date();
  const saved = record
    ? await prisma.consultation_records.update({
        where: { id: record.id },
        data: {
          fields: merged,
          confirmedReportId: report.id,
          confirmedBy: authUser.userId,
          confirmedAt: now,
        },
      })
    : await prisma.consultation_records.create({
        data: {
          appointmentId,
          stylistId: appointment.stylistId,
          clientId: appointment.clientId,
          fields: merged,
          confirmedReportId: report.id,
          confirmedBy: authUser.userId,
          confirmedAt: now,
        },
      });
  const confirmedReport = await prisma.client_reports.update({
    where: { id: report.id },
    data: { status: 'confirmed', confirmedAt: now, confirmedBy: authUser.userId },
  });
  return NextResponse.json({ record: saved, report: confirmedReport });
}
