-- Account deletion detach (App Store fixes, 2026-11-12).
-- Jason's rulings: (1) Square cancel inside the deletion flow, (2) visit
-- photos retained + forfeited to COLORiq. The deletion code detaches the
-- stylist reference (sets it to NULL) instead of deleting rows, so the
-- columns it nulls must be nullable. Pure relaxation — no data changes,
-- no defaults, no rows touched.
--   formula_photos.stylist_id: retained photos detach from the stylist.
--   consultation_appointments / consultation_records / client_report_tokens
--   / client_reports .stylistId: consultation history detaches, never deletes.
-- These four consultation tables are not in the Prisma schema (raw SQL,
-- Nov 10), so this migration is the only schema record of the change.

ALTER TABLE "formula_photos" ALTER COLUMN "stylist_id" DROP NOT NULL;
ALTER TABLE "consultation_appointments" ALTER COLUMN "stylistId" DROP NOT NULL;
ALTER TABLE "consultation_records" ALTER COLUMN "stylistId" DROP NOT NULL;
ALTER TABLE "client_report_tokens" ALTER COLUMN "stylistId" DROP NOT NULL;
ALTER TABLE "client_reports" ALTER COLUMN "stylistId" DROP NOT NULL;
