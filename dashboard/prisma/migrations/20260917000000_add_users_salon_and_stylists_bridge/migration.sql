-- Both columns are nullable/additive: no existing rows are touched, no data loss,
-- nothing currently reads or writes them, so this is safe to run against the live DB
-- without app downtime. Written by hand (not via `prisma migrate dev`) because this
-- session has no network path to the Supabase instance to run it directly — run this
-- yourself with `npx prisma migrate deploy`, or apply the SQL directly, then `npx
-- prisma generate` to refresh the client.

-- 1. users.salon_id — there was previously NO way to resolve which salon an
--    authenticated user belongs to; several routes referenced `user.salon_id` from an
--    unverified client-supplied token field that never corresponded to a real column.
ALTER TABLE "users" ADD COLUMN "salon_id" UUID;
ALTER TABLE "users" ADD CONSTRAINT "users_salon_id_fkey"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "idx_users_salon" ON "users"("salon_id");

-- 2. stylists.user_id — bridges the real login identity (users, used by
--    login/register/JWT auth) to the richer creator/community profile identity
--    (stylists, used by community_posts/post_likes/post_comments/marketplace).
--    Nothing has ever created a stylists row, so community/marketplace features are
--    currently unreachable for any real account. This column lets registration (or a
--    backfill) create the missing link.
ALTER TABLE "stylists" ADD COLUMN "user_id" UUID;
ALTER TABLE "stylists" ADD CONSTRAINT "stylists_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "stylists_user_id_key" ON "stylists"("user_id");

-- 3. stylists.handle — the public @handle (getCOLORiq.co/@handle) collected at
--    registration and validated there, but never persisted anywhere (no column existed
--    on either users or stylists). Every new signup silently lost it.
ALTER TABLE "stylists" ADD COLUMN "handle" VARCHAR(30);
CREATE UNIQUE INDEX "stylists_handle_key" ON "stylists"("handle");

-- 4. phorest_connections — app/api/v1/phorest/connect/route.ts (the encrypted-
--    password implementation) queries this table but it never existed, so every
--    call on that route threw at runtime (masked by next.config.ts's
--    ignoreBuildErrors). The older app/api/phorest/* routes use a separate
--    JSONB-in-salons.settings mechanism instead, which was ALSO storing the
--    Phorest password in plaintext despite being labeled "password_encrypted" —
--    fixed separately in integrations/phorest/phorest-sync.ts to actually call
--    encryptPhorestPassword/decryptPhorestPassword.
CREATE TABLE "phorest_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salon_id" UUID NOT NULL,
    "business_id" VARCHAR(100) NOT NULL,
    "branch_id" VARCHAR(100) NOT NULL,
    "api_email" VARCHAR(255) NOT NULL,
    "api_password" TEXT NOT NULL,
    "server_region" VARCHAR(10) NOT NULL DEFAULT 'us',
    "status" VARCHAR(20) NOT NULL DEFAULT 'connected',
    "last_sync_at" TIMESTAMP(6),
    "sync_error" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT now(),
    "updated_at" TIMESTAMP(6) DEFAULT now(),

    CONSTRAINT "phorest_connections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "phorest_connections_salon_id_key" ON "phorest_connections"("salon_id");
CREATE INDEX "idx_phorest_connections_status" ON "phorest_connections"("status");
ALTER TABLE "phorest_connections" ADD CONSTRAINT "phorest_connections_salon_id_fkey"
  FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- 5. Profile fields on stylists needed to replace /api/profile's hardcoded
--    in-memory Map (which was seeded with one real salon's actual bio/email).
ALTER TABLE "stylists" ADD COLUMN "location" VARCHAR(100);
ALTER TABLE "stylists" ADD COLUMN "salon_name" VARCHAR(100);
ALTER TABLE "stylists" ADD COLUMN "specialties" TEXT[] NOT NULL DEFAULT '{}';

-- 6. Marketplace: one real formula_listings table replacing two disconnected,
--    never-reconciled mock prototypes (lib/api/mock-data.ts's separate
--    `templates[]` and `formulas[]` arrays — created by different routes,
--    purchased/used by different routes, with two incompatible tier-pricing
--    schemes that would have thrown at runtime the first time anyone hit
--    /api/marketplace/usage, since formula.tier values never matched
--    TIER_PRICING's keys). formula_purchases/formula_usage_log already existed
--    in the schema with the right shape for this (perUseFee, totalUses,
--    creatorPayout, platformFee) but their formulaId column had no real table
--    to reference — every dollar amount they'd have computed was against a
--    non-existent row.
--
-- NOTE: formula_purchases.formulaId and formula_usage_log.formulaId get real FK
-- constraints below. If either table already has rows in production whose
-- formulaId doesn't correspond to a real formula_listings row, this migration
-- will fail at the ALTER TABLE ... ADD CONSTRAINT step — check
-- `SELECT count(*) FROM formula_purchases` / `formula_usage_log` first; on a
-- pre-launch DB these should be empty.
CREATE TABLE "formula_listings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creator_id" UUID NOT NULL,
    "source_formula_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "tier" VARCHAR(20) NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 50,
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "per_use_cents" INTEGER NOT NULL DEFAULT 0,
    "photo_url" TEXT,
    "share_code" VARCHAR(20),
    "rating" DECIMAL(3,2) DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formula_listings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "formula_listings_share_code_key" ON "formula_listings"("share_code");
CREATE INDEX "idx_formula_listings_category" ON "formula_listings"("category");
CREATE INDEX "idx_formula_listings_creator" ON "formula_listings"("creator_id");
CREATE INDEX "idx_formula_listings_active" ON "formula_listings"("is_active");
ALTER TABLE "formula_listings" ADD CONSTRAINT "formula_listings_creator_id_fkey"
  FOREIGN KEY ("creator_id") REFERENCES "stylists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "formula_listings" ADD CONSTRAINT "formula_listings_source_formula_id_fkey"
  FOREIGN KEY ("source_formula_id") REFERENCES "formulas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE TABLE "formula_client_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stylist_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "client_name" VARCHAR(200) NOT NULL,
    "client_email" VARCHAR(255),
    "consumer_notes" TEXT,
    "appointment_date" TIMESTAMP(6),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "decline_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formula_client_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_formula_client_requests_stylist" ON "formula_client_requests"("stylist_id");
CREATE INDEX "idx_formula_client_requests_status" ON "formula_client_requests"("status");
ALTER TABLE "formula_client_requests" ADD CONSTRAINT "formula_client_requests_stylist_id_fkey"
  FOREIGN KEY ("stylist_id") REFERENCES "stylists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "formula_client_requests" ADD CONSTRAINT "formula_client_requests_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "formula_listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "formula_billing_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stylist_id" UUID NOT NULL,
    "billing_period" VARCHAR(7) NOT NULL,
    "line_items" JSONB NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "total_creator_earnings_cents" INTEGER NOT NULL,
    "total_platform_fee_cents" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "square_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formula_billing_invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uniq_formula_billing_invoice_period" ON "formula_billing_invoices"("stylist_id", "billing_period");
CREATE INDEX "idx_formula_billing_invoices_status" ON "formula_billing_invoices"("status");
ALTER TABLE "formula_billing_invoices" ADD CONSTRAINT "formula_billing_invoices_stylist_id_fkey"
  FOREIGN KEY ("stylist_id") REFERENCES "stylists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "formula_usage_log" ADD COLUMN "billingInvoiceId" UUID;
CREATE INDEX "idx_formula_usage_log_invoice" ON "formula_usage_log"("billingInvoiceId");
ALTER TABLE "formula_usage_log" ADD CONSTRAINT "formula_usage_log_billingInvoiceId_fkey"
  FOREIGN KEY ("billingInvoiceId") REFERENCES "formula_billing_invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "formula_purchases" ADD CONSTRAINT "formula_purchases_formulaId_fkey"
  FOREIGN KEY ("formulaId") REFERENCES "formula_listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "formula_usage_log" ADD CONSTRAINT "formula_usage_log_formulaId_fkey"
  FOREIGN KEY ("formulaId") REFERENCES "formula_listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
