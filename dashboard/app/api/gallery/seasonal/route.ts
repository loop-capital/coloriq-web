/**
 * GET /api/gallery/seasonal
 * Seasonal color collections — NO auth required.
 *
 * Phase 1 item 2: there is no seasonal-collection entity in the database
 * — the old route served hand-written mock collections. Returning an
 * empty list is the honest answer until an editorial collection model
 * exists; inventing collections from transformation data (which carries
 * no season signal) would fabricate curation. The envelope and the
 * ?season= param are unchanged.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SeasonalCollection, ApiResponse } from '@/lib/api/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');

    // No seasonal collections exist in the DB; nothing to filter.
    const collections: SeasonalCollection[] = [];
    void season;

    return NextResponse.json<ApiResponse<SeasonalCollection[]>>({
      success: true,
      data: collections,
      meta: { total: collections.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch seasonal collections';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: { code: 'SEASONAL_FAILED', message },
    }, { status: 500 });
  }
}
