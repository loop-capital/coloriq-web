import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cron endpoint — called by Vercel cron job daily
// Protected by CRON_SECRET header
export async function GET(request: Request) {
  try {
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all salons with Square connected and auto-import enabled
    const connections = await prisma.square_connections.findMany({
      where: {
        access_token_encrypted: { not: null },
        salon: {
          features_enabled: {
            path: ['square_client_sync'],
            equals: true,
          },
        },
      },
      include: { salon: true },
    });

    const results = [];

    for (const conn of connections) {
      try {
        // Call the sync endpoint internally
        const syncRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://getCOLORiq.co'}/api/square/clients/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ salon_id: conn.salon_id }),
        });

        const syncData = await syncRes.json();
        results.push({
          salon_id: conn.salon_id,
          salon_name: conn.salon?.name,
          success: syncData.success,
          imported: syncData.data?.imported || 0,
          updated: syncData.data?.updated || 0,
          errors: syncData.data?.errors || 0,
        });
      } catch (err) {
        results.push({
          salon_id: conn.salon_id,
          salon_name: conn.salon?.name,
          success: false,
          error: err instanceof Error ? err.message : 'Sync failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        salons_processed: results.length,
        results,
      },
    });
  } catch (error: any) {
    console.error('[square/clients/sync-cron] Error:', error);
    return NextResponse.json({ error: error.message || 'Cron failed' }, { status: 500 });
  }
}
