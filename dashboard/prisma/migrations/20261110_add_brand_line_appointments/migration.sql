-- Phase 1 item 7 adopted change (Jason ruling 2026-11-10): the stylist
-- selects the brand/line at appointment creation; the invitation email
-- names it so the client never arrives hoping for a brand the salon
-- does not carry. Nullable: appointments created before this migration
-- (incl. the Thu Nov 12 rehearsal record) have no brand/line on file.
ALTER TABLE "consultation_appointments" ADD COLUMN "brand" VARCHAR(100);
ALTER TABLE "consultation_appointments" ADD COLUMN "line" VARCHAR(100);
