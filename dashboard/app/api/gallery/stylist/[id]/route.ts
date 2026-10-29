/**
 * GET /api/gallery/stylist/[id]
 * Stylist portfolio — NO auth required.
 * NOTE: Next.js App Router uses [id] param. This file handles /api/gallery/stylist/:id
 *
 * Phase 1 item 2: real DB reads. The portfolio is the stylist row plus
 * that stylist's published, consented transformations as recent work.
 * The id param accepts either a stylists.id or a users.id (both id
 * conventions exist in this codebase) — the resolved stylist row is what
 * the transformation query uses. Drafts and consent-less rows are
 * excluded, exactly as on the public gallery.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { displayName, hasValidConsent, transformationToGalleryItem } from '@/lib/pool-reads';
import { StylistPortfolio, ApiResponse } from '@/lib/api/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const { id } = await params;

    let stylist: any = await (prisma as any).stylists.findUnique({ where: { id } });
    if (!stylist) {
      stylist = await (prisma as any).stylists.findFirst({ where: { user_id: id } });
    }
    if (!stylist) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: { code: 'STYLIST_NOT_FOUND', message: 'Stylist portfolio not found' },
      }, { status: 404 });
    }

    const rows = await (prisma as any).transformations.findMany({
      where: { stylist_id: stylist.id, status: 'published', after_photo_ref: { not: null } },
      include: {
        stylist: { select: { id: true, display_name: true, first_name: true, last_name: true, avatar_url: true, bio: true, instagram_handle: true, follower_count: true } },
        formulation: { select: { brand: true, product_line: true, target_level: true, target_tone: true, primary_formula: true } },
      },
      orderBy: { published_at: 'desc' },
    });
    const consented = (rows as any[]).filter((t) => hasValidConsent(t.client_consent));
    const recentWork = consented.map(transformationToGalleryItem);

    const portfolio: StylistPortfolio = {
      stylist_id: stylist.id,
      stylist_name: displayName(stylist),
      stylist_avatar: stylist.avatar_url ?? undefined,
      stylist_bio: stylist.bio ?? undefined,
      stylist_specialty: undefined,
      portfolio_count: recentWork.length,
      total_likes: 0,
      follower_count: stylist.follower_count ?? 0,
      recent_work: recentWork.slice(0, 20),
      specialties: [],
    };

    return NextResponse.json<ApiResponse<StylistPortfolio>>({
      success: true,
      data: portfolio,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stylist portfolio';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: { code: 'STYLIST_FAILED', message },
    }, { status: 500 });
  }
}
