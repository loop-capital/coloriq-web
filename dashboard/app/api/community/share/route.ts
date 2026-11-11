import { NextRequest } from 'next/server';
import { getCurrentUser, requireAuth } from '@/lib/api/auth';
import { successResponse, errorResponse, Errors } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { validateConsent } from '@/lib/transformations';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!requireAuth(user)) return Errors.UNAUTHORIZED();

  try {
    const body = await req.json();

    // Consent gate (Phase 1 item 3), patterned on the transformations
    // publish gate: images are the share equivalent of publish's after
    // photo, checked first; then the consent record.
    const images = body.images;
    const hasImages =
      Array.isArray(images) && images.some((i) => typeof i === 'string' && i.length > 0);
    if (!hasImages) {
      return errorResponse(
        'AFTER_PHOTO_REQUIRED',
        'Attach at least one image before sharing.',
        422
      );
    }

    // community_posts has no consent column: the consent supplied in the
    // request is validated and enforced here, not persisted. Consent
    // records and the revocation chassis are item 4's scope, not this
    // gate's. Consent is stylist-attested at this stage (attested_by
    // defaults to the stylist id, per validateConsent).
    const v = validateConsent(body.client_consent, user.id);
    if (!v.ok) {
      return errorResponse(
        'CONSENT_REQUIRED',
        'A marketing consent record is required to share. ' + v.error,
        422
      );
    }

    const post = await prisma.community_posts.create({
      data: {
        stylist_id: user.id,
        title: body.title || null,
        content: body.content || '',
        type: body.type || 'tip',
        tags: body.tags || [],
        images: body.images || [],
        is_anonymous: body.is_anonymous || false,
        moderation_status: 'pending',
      },
    });

    // community_posts has no title/moderation_status columns in the current
    // Prisma schema -- cast preserves the response shape for a future
    // migration (flagged for the DB migration check). No runtime change.
    const typedPost = post as typeof post & {
      title: string | null;
      moderation_status: string | null;
    };

    return successResponse({
      id: post.id,
      stylist_id: post.stylist_id,
      title: typedPost.title,
      content: post.content,
      type: post.type,
      tags: post.tags,
      moderation_status: typedPost.moderation_status,
      created_at: post.created_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body';
    return errorResponse('VALIDATION_ERROR', message, 422);
  }
}
