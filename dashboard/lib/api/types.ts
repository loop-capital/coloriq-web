/**
 * ColorIq API Shared Types
 * Standard response format and domain types
 */

// ─── Standard API Response ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    cursor?: string;
    total?: number;
  };
}

// ─── Community Types ──────────────────────────────────────────────────────────

export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  author_handle?: string;
  author_is_educator?: boolean;
  type: CommunityPostType;
  formulation_id?: string;
  formulation_snapshot?: {
    brand: string;
    line: string;
    shade_code: string;
    shade_name: string;
    level: number;
    tone: string;
    developer_volume: number;
    processing_time: number;
    application: string;
  };
  before_photo?: string;
  after_photo?: string;
  image_urls?: string[];
  caption?: string;
  content?: string; // text-only post content
  hair_description?: string;
  tags: string[];
  likes: number;
  saves: number;
  comments: number;
  score: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user_liked?: boolean;
  user_saved?: boolean;
}

export type CommunityPostType = 'tip' | 'question' | 'review' | 'formula_share';

export interface VoteRecord {
  post_id: string;
  user_id: string;
  action: 'like' | 'save' | 'unlike' | 'unsave';
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

export interface CreatePostInput {
  type: CommunityPostType;
  content: string;
  caption?: string;
  image_urls?: string[];
  formulation_id?: string;
  tags?: string[];
  is_public?: boolean;
}

// ─── Marketplace Types ──────────────────────────────────────────────────────────

export interface Template {
  id: string;
  creator_id: string;
  creator_name: string;
  community_post_id: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  price_cents: number;
  rating: number;
  review_count: number;
  purchase_count: number;
  adaptation_params: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  buyer_id: string;
  template_id: string;
  price_paid_cents: number;
  creator_earnings_cents: number;
  platform_fee_cents: number;
  status: 'pending' | 'completed' | 'refunded';
  created_at: string;
}

export interface CreatorEarnings {
  creator_id: string;
  total_sales: number;
  total_earnings_cents: number;
  pending_payout_cents: number;
  templates_count: number;
  top_templates: Array<{
    template_id: string;
    title: string;
    sales: number;
    earnings_cents: number;
  }>;
}

// ─── Gallery Types ──────────────────────────────────────────────────────────────

export interface GalleryItem {
  id: string;
  post_id: string;
  stylist_id: string;
  stylist_name: string;
  stylist_avatar?: string;
  stylist_bio?: string;
  stylist_location?: string;
  formulation_snapshot: {
    brand: string;
    line: string;
    shade_code: string;
    shade_name: string;
    level: number;
    tone: string;
    color_hex: string;
    color_family: string;
  };
  after_photo: string;
  before_photo?: string;
  caption?: string;
  tags: string[];
  likes: number;
  season?: string;
  created_at: string;
}

export interface TrendingColor {
  id: string;
  shade_name: string;
  shade_code: string;
  color_hex: string;
  color_family: string;
  brand: string;
  line: string;
  level: number;
  tone: string;
  post_count: number;
  like_count: number;
  trend_score: number;
  sample_photos: string[];
}

export interface SeasonalCollection {
  season: string;
  title: string;
  description: string;
  colors: Array<{
    id: string;
    shade_name: string;
    shade_code: string;
    color_hex: string;
    color_family: string;
    description: string;
    sample_photo?: string;
  }>;
  created_at: string;
}

export interface StylistPortfolio {
  stylist_id: string;
  stylist_name: string;
  stylist_avatar?: string;
  stylist_bio?: string;
  stylist_location?: string;
  stylist_specialty?: string;
  portfolio_count: number;
  total_likes: number;
  follower_count: number;
  recent_work: GalleryItem[];
  specialties: string[];
}

// ─── Marketplace Billing Types ──────────────────────────────────────────────────

export interface BillingTier {
  tier: string;
  per_use_cents: number;
  creator_share_pct: number;
  monthly_cap_cents?: number;
}

export const TIER_PRICING: Record<string, BillingTier> = {
  free: { tier: 'free', per_use_cents: 0, creator_share_pct: 0 },
  basic: { tier: 'basic', per_use_cents: 25, creator_share_pct: 70 },
  premium: { tier: 'premium', per_use_cents: 50, creator_share_pct: 70 },
  exclusive: { tier: 'exclusive', per_use_cents: 100, creator_share_pct: 70 },
};

export interface BillingLineItem {
  formula_id: string;
  formula_title: string;
  creator_id: string;
  tier: string;
  use_count: number;
  per_use_cents: number;
  total_cents: number;
  creator_earnings_cents: number;
  platform_fee_cents: number;
}

export interface MonthlyBillingInvoice {
  id: string;
  stylist_id: string;
  billing_period: string;
  line_items: BillingLineItem[];
  total_cents: number;
  total_creator_earnings_cents: number;
  total_platform_fee_cents: number;
  status: 'pending' | 'paid' | 'failed';
  paid_at?: string;
  square_payment_id?: string;
  created_at: string;
}

export interface FormulaUseEvent {
  id: string;
  stylist_id: string;
  formula_id: string;
  client_name?: string;
  service_id?: string;
  used_at: string;
  billed: boolean;
  invoice_id?: string;
  billing_period?: string;
}

// ─── Marketplace Formula Types ──────────────────────────────────────────────────

export type FormulaTier = 'community' | 'professional' | 'master' | 'signature';

export interface Formula {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_avatar?: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  brand?: string;
  line?: string;
  shade_code?: string;
  shade_name?: string;
  level?: number;
  tone?: string;
  developer_volume?: number;
  processing_time?: number;
  application?: string;
  score: number;
  tier: FormulaTier;
  price_cents: number;
  per_use_cents: number;
  usage_count: number;
  purchase_count: number;
  share_code: string;
  rating: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function getTierForScore(score: number): FormulaTier {
  if (score >= 85) return 'signature';
  if (score >= 70) return 'master';
  if (score >= 50) return 'professional';
  return 'community';
}

export interface ClientRequest {
  id: string;
  stylist_id: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  share_code: string;
  consumer_notes?: string;
  appointment_date?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  formula_ready: boolean;
  formula_id?: string;
  formula_title?: string;
  creator_name?: string;
  tier?: string;
  per_use_cents?: number;
  color_hex?: string;
  required_products?: string[];
  decline_reason?: string;
  created_at: string;
  updated_at: string;
}
