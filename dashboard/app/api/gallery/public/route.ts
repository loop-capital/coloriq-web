/**
 * GET /api/gallery/public
 * Public consumer gallery — NO auth required.
 *
 * Phase 1 item 2: real DB reads. Serves published transformations with a
 * valid stored marketing consent record (see lib/pool-reads.ts). No
 * community posts: community_posts carries no stored consent, so no read
 * filter can verify consent for another stylist's post (item 4 owns
 * consent persistence).
 *
 * Known limitation, stated not silent: transformations carry no season
 * signal, so a ?season= query matches nothing (total 0). The old route
 * served mock items with fabricated seasons; this route does not invent
 * one. color_family filters on the tone-derived family.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateOrThrow, galleryQuerySchema } from '@/lib/api/validation';
import { fetchConsentedTransformations, transformationToGalleryItem } from '@/lib/pool-reads';
import { GalleryItem, ApiResponse } from '@/lib/api/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = {
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || undefined,
      season: searchParams.get('season') || undefined,
      color_family: searchParams.get('color_family') || undefined,
    };
    const query = validateOrThrow(galleryQuerySchema, raw);

    let items = (await fetchConsentedTransformations()).map(transformationToGalleryItem);

    // Apply filters
    if (query.season) {
      // No season signal exists on transformations — a season query honestly matches nothing.
      items = [];
    }
    if (query.color_family) {
      items = items.filter(
        (i) => i.formulation_snapshot.color_family.toLowerCase() === query.color_family!.toLowerCase()
      );
    }

    // Sort by newest
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Cursor pagination
    let startIdx = 0;
    if (query.cursor) {
      const idx = items.findIndex((i) => i.id === query.cursor);
      if (idx >= 0) startIdx = idx + 1;
    }

    const page = items.slice(startIdx, startIdx + query.limit);
    const nextCursor = page.length === query.limit && startIdx + query.limit < items.length
      ? page[page.length - 1].id
      : undefined;

    return NextResponse.json<ApiResponse<GalleryItem[]>>({
      success: true,
      data: page,
      meta: {
        cursor: nextCursor,
        total: items.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch gallery';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: { code: 'GALLERY_FAILED', message },
    }, { status: 500 });
  }
}
