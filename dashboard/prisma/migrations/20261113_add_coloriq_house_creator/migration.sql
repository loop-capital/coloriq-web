-- COLORiq house creator (2026-11-13).
-- Jason's ruling (2026-11-12): on account deletion the stylist forfeits
-- their visit photos and any revenue they generate to COLORiq. Sienna's
-- disposition (2026-11-12): option (a) -- reassign the listings to a
-- COLORiq house creator. The marketplace 70/30 ledger keys off
-- formula_listings.creator_id, so this row is the reassignment target in
-- deleteAccount(): future creator payouts on forfeited listings accrue to
-- COLORiq. Past usage-log rows are untouched (history is not rewritten).
-- The row has no login user (user_id NULL) and an unusable password hash,
-- so it can never sign in. The id/email/handle are stable identifiers --
-- do not change them; the deletion code matches on the id below.

INSERT INTO "stylists" ("id", "email", "password_hash", "first_name", "last_name", "display_name", "handle", "user_id", "is_active", "is_verified", "creator_tier", "created_at", "updated_at")
VALUES ('258e3f0b-9963-4178-a4c2-6b5dfeefcc04', 'house-creator@coloriq.invalid', '!house-creator-no-login', 'COLORiq', 'House', 'COLORiq', 'coloriq', NULL, true, true, 'community', now(), now())
ON CONFLICT ("id") DO NOTHING;
