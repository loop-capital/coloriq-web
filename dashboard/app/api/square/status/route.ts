/**
 * GET /api/square/status
 * Check if a salon has Square connected
 *
 * DELETE /api/square/status
 * Disconnect Square from a salon
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection, removeConnection, isConnected, getAuthUrl } from '@/lib/square-multi';
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

  const connected = await isConnected(salonId);
  const connection = await getConnection(salonId);

  if (connected && connection) {
    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        business_name: connection.business_name,
        merchant_id: connection.merchant_id,
        location_ids: connection.location_ids,
        connected_at: connection.connected_at,
        catalog_synced_at: connection.catalog_synced_at,
        client_sync_enabled: false,
        last_client_sync_at: null,
      },
    });
  }

  // Return connect URL if not connected
  const redirectUri = `${request.headers.get('origin') || 'https://coloriq.co'}/api/square/oauth/callback`;
  const authUrl = getAuthUrl(salonId, redirectUri);

  return NextResponse.json({
    success: true,
    data: {
      connected: false,
      connect_url: authUrl,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const salonId = await resolveSalonId(request);
  if (!salonId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, { status: 401 });
  }

  await removeConnection(salonId);

  return NextResponse.json({
    success: true,
    data: { message: 'Square disconnected' },
  });
}