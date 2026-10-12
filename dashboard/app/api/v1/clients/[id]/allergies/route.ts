// ============================================================
// GET /api/v1/clients/[id]/allergies — List client allergies
// POST /api/v1/clients/[id]/allergies — Record a new allergy
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireAuth } from '@/lib/api/auth';

const VALID_SEVERITIES = ['mild', 'moderate', 'severe'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!requireAuth(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const allergies = await prisma.client_allergies.findMany({
      where: { client_id: id },
      orderBy: { created_at: 'desc' },
    });

    // Also surface legacy JSON allergies from the clients record
    const client = await prisma.clients.findUnique({
      where: { id },
      select: { allergies: true },
    });
    const legacy = (client?.allergies_legacy as any) || {};
    const legacyFlags: string[] = [];
    if (legacy.ppd) legacyFlags.push('PPD');
    if (legacy.ammonia) legacyFlags.push('ammonia');
    if (legacy.fragrance) legacyFlags.push('fragrance');
    if (Array.isArray(legacy.other)) legacyFlags.push(...legacy.other);

    return NextResponse.json({ allergies, legacyFlags });
  } catch (err) {
    console.error('[allergies] GET error:', err);
    return NextResponse.json({ error: 'Failed to load allergies' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!requireAuth(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();

    const { allergen, severity, notes } = body;

    if (!allergen) {
      return NextResponse.json({ error: 'allergen is required' }, { status: 400 });
    }
    if (!VALID_SEVERITIES.includes(severity)) {
      return NextResponse.json(
        { error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` },
        { status: 400 }
      );
    }

    const allergy = await prisma.client_allergies.create({
      data: {
        client_id: id,
        allergen,
        severity,
        notes: notes || undefined,
        recorded_by: user.id || undefined,
      },
    });

    return NextResponse.json({ allergy }, { status: 201 });
  } catch (err) {
    console.error('[allergies] POST error:', err);
    return NextResponse.json({ error: 'Failed to record allergy' }, { status: 500 });
  }
}
