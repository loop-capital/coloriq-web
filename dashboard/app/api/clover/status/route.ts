/**
 * GET /api/clover/status — check if a salon has Clover connected
 * DELETE /api/clover/status — disconnect Clover
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection, removeConnection, getAuthUrl } from '@/lib/clover-multi';
import { getUserFromRequest } from '@/lib/auth';
import { getSalonIdForUser } from '@/lib/stylist';

async function resolveSalonId(request: NextRequest): Promise<string | null> {
  const authUser = await getUserFromRequest(request);
  if (!authUser) return null;
  return getSalonIdForUser(authUser.userId);
}

export async function GET(request: NextRequest) {
  const salonId = await resolveSalonId(request);
  if (!salonId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, { status: 401 });
  }

  const connection = await getConnection(salonId);
  if (connection) {
    return NextResponse.json({
      success: true,
      data: { connected: true, merchant_name: connection.merchant_name, merchant_id: connection.merchant_id },
    });
  }

  const redirectUri = `${request.headers.get('origin') || 'https://coloriq.co'}/api/clover/oauth/callback`;
  return NextResponse.json({
    success: true,
    data: { connected: false, connect_url: getAuthUrl(salonId, redirectUri) },
  });
}

export async function DELETE(request: NextRequest) {
  const salonId = await resolveSalonId(request);
  if (!salonId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, { status: 401 });
  }
  await removeConnection(salonId);
  return NextResponse.json({ success: true, data: { message: 'Clover disconnected' } });
}
