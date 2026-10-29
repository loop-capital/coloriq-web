/**
 * GET /api/community/posts/[id]
 * Single post with comments.
 *
 * Phase 1 item 2: real DB reads, same consent rule as the feed — only
 * the post's owner may read it. A non-owner (or anonymous reader)
 * requesting another stylist's post gets 404, the same code as a
 * missing post, so held-out posts do not leak their existence. Comments
 * served are approved and unflagged only (post_comments.is_approved,
 * is_flagged). Vote state from post_likes; user_saved always false
 * (saves have no backing table).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse, CommunityPost, PostComment } from '@/lib/api/types';
import { fetchLikeState, isOwnPost, resolveReader, serializeCommunityPost, serializePostComment } from '@/lib/pool-reads';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reader = await resolveReader(request);
    const { id } = await params;

    const post: any = await (prisma as any).community_posts.findUnique({
      where: { id },
      include: { stylist: { select: { id: true, display_name: true, first_name: true, last_name: true, avatar_url: true, bio: true, instagram_handle: true, follower_count: true } } },
    });
    if (!post || !isOwnPost(post, reader)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: { code: 'POST_NOT_FOUND', message: 'Community post not found' },
      }, { status: 404 });
    }

    const commentRows = await (prisma as any).post_comments.findMany({
      where: { post_id: id, is_approved: true, is_flagged: false },
      include: { author: { select: { id: true, display_name: true, first_name: true, last_name: true, avatar_url: true } } },
      orderBy: { created_at: 'asc' },
    });

    const liked = await fetchLikeState(reader, [id]);
    const data: { post: CommunityPost; comments: PostComment[] } = {
      post: serializeCommunityPost(post, { liked: liked.has(id) }),
      comments: (commentRows as any[]).map(serializePostComment),
    };

    return NextResponse.json<ApiResponse<{ post: CommunityPost; comments: PostComment[] }>>({
      success: true,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch post';
    return NextResponse.json<ApiResponse>({
      success: false,
      error: { code: 'POST_FETCH_FAILED', message },
    }, { status: 500 });
  }
}
