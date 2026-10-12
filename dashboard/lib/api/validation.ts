/**
 * ColorIq API Validation
 * Zod schemas for all API inputs
 */

import { z } from 'zod';

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── Community ────────────────────────────────────────────────────────────────

export const sharePostSchema = z.object({
  formulation_id: z.string().uuid(),
  before_photo: z.string().url().optional(),
  after_photo: z.string().url().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  is_public: z.boolean().default(true),
  caption: z.string().max(2000).optional(),
  hair_description: z.string().max(1000).optional(),
});

export type SharePostInput = z.infer<typeof sharePostSchema>;

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  filter: z.enum(['trending', 'newest', 'following']).default('newest'),
});

export type FeedQueryInput = z.infer<typeof feedQuerySchema>;

export const voteSchema = z.object({
  post_id: z.string().uuid(),
  action: z.enum(['like', 'save', 'unlike', 'unsave']),
});

export type VoteInput = z.infer<typeof voteSchema>;

// ─── NEW: Community Post Creation ──────────────────────────────────────────────

export const createPostSchema = z.object({
  type: z.enum(['tip', 'question', 'review', 'formula_share']),
  content: z.string().min(1).max(5000),
  caption: z.string().max(2000).optional(),
  image_urls: z.array(z.string().url()).max(4).default([]),
  formulation_id: z.string().uuid().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  is_public: z.boolean().default(true),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const commentSchema = z.object({
  post_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

export type CommentInput = z.infer<typeof commentSchema>;

export const postIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type PostIdParamInput = z.infer<typeof postIdParamSchema>;

// ─── Marketplace ──────────────────────────────────────────────────────────────

export const listTemplateSchema = z.object({
  // community posts aren't backed by real, stable ids yet (still on mock data
  // as of this pass) — kept optional rather than enforced against a table that
  // doesn't exist, until community is migrated off mock-data.ts too.
  community_post_id: z.string().uuid().optional(),
  price_cents: z.coerce.number().int().min(0).max(1000000),
  adaptation_params: z.record(z.string(), z.unknown()).default({}),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(50),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
});

export type ListTemplateInput = z.infer<typeof listTemplateSchema>;

export const browseQuerySchema = z.object({
  category: z.string().optional(),
  price_min: z.coerce.number().int().min(0).optional(),
  price_max: z.coerce.number().int().min(0).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.enum(['popular', 'newest', 'price']).default('popular'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type BrowseQueryInput = z.infer<typeof browseQuerySchema>;

export const purchaseSchema = z.object({
  template_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;

// ─── Gallery ────────────────────────────────────────────────────────────────

export const galleryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  color_family: z.string().optional(),
});

export type GalleryQueryInput = z.infer<typeof galleryQuerySchema>;

export const stylistIdSchema = z.object({
  id: z.string().uuid(),
});

export type StylistIdInput = z.infer<typeof stylistIdSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function validateOrThrow<T>(schema: z.ZodType<T, z.ZodTypeDef, any>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Validation failed: ${issues.join('; ')}`);
  }
  return result.data;
}
