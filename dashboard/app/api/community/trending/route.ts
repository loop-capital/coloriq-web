/**
 * GET /api/community/trending
 * Top 20 community posts by score.
 *
 * Phase 1 item 2: real DB reads, same consent rule as the feed — only
 * the reader's own posts (either id convention). Another stylist's post
 * is never served here until item 4 persists consent. Anonymous readers
 * get an empty list. Vote state from post_likes; user_saved always
 * false (saves have no backing table).
 */

import { NextRequest, NextResponse } from 'next/server';
import { CommunityPost, ApiResponse } from '@/lib/api/types';
import { fetchLikeState, fetchOwnCommunityPosts, resolveReader, serializeCommunityPost } from '@/lib/pool-reads';

export async function GET(request: NextRequest) {
  try {
    const reader = await resolveReader(request);

    const own = await fetchOwnCommunityPosts(reader);
    const top = [...own]
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
      .slice(0, 20);

    const liked = await fetchLikeState(reader, top.map((p) => p.id));
    const posts: CommunityPost[] = top.map((p) =>
      serializeCommunityPost(p, { liked: liked.has(p.id) })
    );

    return NextResponse.json<ApiResponse<CommunityPost[]>>({
      success: true,
      data: posts,
      meta: { total: posts.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch trending';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: { code: 'TRENDING_FAILED', message },
    }, { status: 500 });
  }
}
