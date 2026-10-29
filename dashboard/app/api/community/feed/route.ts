/**
 * GET /api/community/feed
 * Paginated community feed with filtering.
 *
 * Phase 1 item 2: real DB reads. community_posts carries no stored
 * consent record, so no read filter can verify consent for another
 * stylist's post (item 4 owns consent persistence). The feed therefore
 * serves ONLY the reader's own posts (either id convention: the JWT
 * user id or the resolved stylist id), plus nothing else. Anonymous
 * readers get an empty list — not an error, and not other stylists'
 * unconsented posts. Transformations are gallery content and are not
 * shoehorned into the CommunityPost shape here.
 *
 * Vote state comes from post_likes (likes only); user_saved is always
 * false because saves have no backing table (the vote route already
 * returns 501 for save/unsave). Search and sort run over the reader's
 * own posts, matching the old route's substring semantics; 'following'
 * behaves as 'newest' because no follow graph exists.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, CommunityPost } from '@/lib/api/types';
import { fetchLikeState, fetchOwnCommunityPosts, resolveReader, serializeCommunityPost } from '@/lib/pool-reads';

export async function GET(request: NextRequest) {
  try {
    const reader = await resolveReader(request);

    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const filter = searchParams.get('filter') || 'newest';
    const search = searchParams.get('search') || '';

    const own = await fetchOwnCommunityPosts(reader);

    // Search filter (substring, as the old route)
    let posts = own;
    if (search) {
      const q = search.toLowerCase();
      posts = posts.filter((p) =>
        (p.content || '').toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.tags || []).some((t: string) => t.toLowerCase().includes(q)) ||
        (p.formula_label || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (filter === 'trending') {
      posts.sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
    } else {
      posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Cursor pagination (skip N)
    const skip = cursor ? parseInt(cursor) : 0;
    const pageRows = posts.slice(skip, skip + limit);

    // Attach user vote state if logged in (likes only; saves have no backing table)
    const liked = await fetchLikeState(reader, pageRows.map((p) => p.id));
    const page: CommunityPost[] = pageRows.map((p) =>
      serializeCommunityPost(p, { liked: liked.has(p.id) })
    );

    const nextCursor = skip + page.length < posts.length ? String(skip + limit) : undefined;

    return NextResponse.json<ApiResponse<CommunityPost[]>>({
      success: true,
      data: page,
      meta: {
        cursor: nextCursor,
        total: posts.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch feed';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: { code: 'FEED_FAILED', message },
    }, { status: 500 });
  }
}
