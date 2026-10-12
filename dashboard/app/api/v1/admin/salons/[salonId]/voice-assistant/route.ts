/**
 * POST /api/v1/admin/salons/:salonId/voice-assistant
 * Admin-only — enable or disable the bowl-side voice assistant for one
 * salon. Deliberately admin-gated, not self-service: it's a per-minute
 * billed feature (real OpenAI cost per question), and a salon opts in by
 * asking ColorIq, not by flipping a switch in their own Settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

const setVoiceAssistantSchema = z.object({ enabled: z.boolean() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ salonId: string }> }
) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const { salonId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = setVoiceAssistantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_BODY', message: parsed.error.message } }, { status: 400 });
  }

  const salon = await prisma.salons.findUnique({ where: { id: salonId }, select: { features_enabled: true } });
  if (!salon) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Salon not found' } }, { status: 404 });
  }

  const features = { ...(salon.features_enabled as Record<string, unknown> | null), voice_assistant: parsed.data.enabled };

  await prisma.salons.update({ where: { id: salonId }, data: { features_enabled: features } });

  return NextResponse.json({ success: true, data: { salonId, voiceAssistantEnabled: parsed.data.enabled } });
}
