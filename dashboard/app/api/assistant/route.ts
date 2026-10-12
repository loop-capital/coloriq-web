/**
 * GET /api/assistant — is the voice assistant enabled for my salon?
 * There is deliberately no PUT here: enabling this is admin-only (see
 * POST /api/v1/admin/salons/:salonId/voice-assistant) since it's a real
 * per-use OpenAI cost — a salon opts in by asking ColorIq, not by
 * flipping their own switch.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { getSalonIdForUser } from '@/lib/stylist';

export async function GET(request: NextRequest) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ success: false, enabled: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const salonId = await getSalonIdForUser(authUser.userId);
  if (!salonId) {
    return NextResponse.json({ success: true, enabled: false });
  }

  const salon = await prisma.salons.findUnique({ where: { id: salonId }, select: { features_enabled: true } });
  const enabled = (salon?.features_enabled as Record<string, unknown> | null)?.voice_assistant === true;

  return NextResponse.json({ success: true, enabled });
}
