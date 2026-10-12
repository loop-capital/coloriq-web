// ============================================================
// DELETE /api/v1/clients/[id]/allergies/[allergyId] — Remove an allergy record
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireAuth } from '@/lib/api/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; allergyId: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!requireAuth(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, allergyId } = await params;

    // Ensure the allergy belongs to this client before deleting
    const existing = await prisma.client_allergies.findFirst({
      where: { id: allergyId, client_id: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Allergy not found' }, { status: 404 });
    }

    await prisma.client_allergies.delete({ where: { id: allergyId } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[allergies] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete allergy' }, { status: 500 });
  }
}
