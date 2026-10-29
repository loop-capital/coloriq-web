/**
 * GET /api/gallery/trending
 * Trending colors — NO auth required.
 *
 * Phase 1 item 2: real DB aggregation. Groups published, consented
 * transformations by (brand, shade_code) from the formulation + shades
 * data; trend_score is the published-transformation count for that shade
 * (transformations carry no likes, so like_count is 0 — reported, not
 * invented). Drafts and consent-less rows never enter the aggregation.
 */

import { NextResponse } from 'next/server';
import { extractShadeInfo, fetchConsentedTransformations } from '@/lib/pool-reads';
import { TrendingColor, ApiResponse } from '@/lib/api/types';

type TrendGroup = {
  shade_name: string;
  shade_code: string;
  brand: string;
  line: string;
  level: number;
  tone: string;
  color_hex: string;
  count: number;
  photos: string[];
};

export async function GET() {
  try {
    const rows = await fetchConsentedTransformations();

    const groups = new Map<string, TrendGroup>();
    for (const t of rows) {
      const shade = extractShadeInfo(t.shades, t.formulation);
      const brand = t.formulation?.brand ?? 'Unknown';
      const line = t.formulation?.product_line ?? '';
      const key = `${brand}|${shade.code}`;
      const g: TrendGroup = groups.get(key) ?? {
        shade_name: shade.name,
        shade_code: shade.code,
        brand,
        line,
        level: shade.level,
        tone: shade.tone,
        color_hex: shade.hex,
        count: 0,
        photos: [],
      };
      g.count += 1;
      if (t.after_photo_ref && g.photos.length < 3) g.photos.push(t.after_photo_ref);
      groups.set(key, g);
    }

    const colors: TrendingColor[] = [...groups.values()]
      .map((g, i) => ({
        id: `trend-${i + 1}`,
        shade_name: g.shade_name,
        shade_code: g.shade_code,
        color_hex: g.color_hex,
        color_family: g.tone.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'unknown',
        brand: g.brand,
        line: g.line,
        level: g.level,
        tone: g.tone,
        post_count: g.count,
        like_count: 0,
        trend_score: g.count,
        sample_photos: g.photos,
      }))
      .sort((a, b) => b.trend_score - a.trend_score)
      .map((c, i) => ({ ...c, id: `trend-${i + 1}` }));

    return NextResponse.json<ApiResponse<TrendingColor[]>>({
      success: true,
      data: colors,
      meta: { total: colors.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch trending colors';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: { code: 'TRENDING_COLORS_FAILED', message },
    }, { status: 500 });
  }
}
