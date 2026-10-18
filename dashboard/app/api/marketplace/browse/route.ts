/**
 * GET /api/marketplace/browse
 * Browse marketplace templates with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateOrThrow, browseQuerySchema } from '@/lib/api/validation';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { hasProductAccess } from '@/lib/entitlements';
import { ApiResponse } from '@/lib/api/types';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      }, { status: 401 });
    }

    // HARD CLOSE (Jason, 2026-10-17): marketplace (incl. free Community tier)
    // is consumed by subscribers only. No free layer.
    if (!(await hasProductAccess(authUser.userId))) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: { code: 'SUBSCRIPTION_REQUIRED', message: 'COLORiq requires an active subscription.' },
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const raw = {
      category: searchParams.get('category') || undefined,
      price_min: searchParams.get('price_min') || undefined,
      price_max: searchParams.get('price_max') || undefined,
      rating: searchParams.get('rating') || undefined,
      sort: searchParams.get('sort') || undefined,
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || undefined,
    };
    const query = validateOrThrow(browseQuerySchema, raw);

    const where: Prisma.formula_listingsWhereInput = { is_active: true };
    if (query.category) where.category = { equals: query.category, mode: 'insensitive' };
    if (query.price_min !== undefined || query.price_max !== undefined) {
      where.price_cents = {};
      if (query.price_min !== undefined) where.price_cents.gte = query.price_min;
      if (query.price_max !== undefined) where.price_cents.lte = query.price_max;
    }
    if (query.rating !== undefined) where.rating = { gte: query.rating };

    const orderBy: Prisma.formula_listingsOrderByWithRelationInput =
      query.sort === 'newest' ? { created_at: 'desc' } :
      query.sort === 'price' ? { price_cents: 'asc' } :
      { purchase_count: 'desc' }; // popular

    // Cursor pagination (by id, consistent with the ordering above being stable enough for a marketplace listing)
    const results = await prisma.formula_listings.findMany({
      where,
      orderBy,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        creator: { select: { id: true, display_name: true, first_name: true, avatar_url: true, is_verified: true } },
      },
    });

    const hasMore = results.length > query.limit;
    const page = hasMore ? results.slice(0, query.limit) : results;
    const nextCursor = hasMore ? page[page.length - 1].id : undefined;
    const total = await prisma.formula_listings.count({ where });

    return NextResponse.json<ApiResponse<typeof page>>({
      success: true,
      data: page,
      meta: { cursor: nextCursor, total },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to browse marketplace';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: { code: 'BROWSE_FAILED', message },
    }, { status: 500 });
  }
}
