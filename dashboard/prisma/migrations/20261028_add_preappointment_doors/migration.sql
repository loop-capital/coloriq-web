-- Phase 1 item 7 (2026-10-28): pre-appointment doors.
-- UNAPPLIED — needs review before any production migration. Item 7
-- verification is local tests/typecheck only; no production DB writes.
-- NOTE (review item at apply time): foreign-key actions below use
-- ON DELETE RESTRICT ON UPDATE CASCADE as the hand-written default; the
-- applying reviewer must confirm them against the Prisma defaults for the
-- @relation fields in schema.prisma before running this migration.

CREATE TABLE "consultation_appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salonId" UUID NOT NULL,
    "stylistId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consultation_appointments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_consultation_appointments_stylist" ON "consultation_appointments"("stylistId");
CREATE INDEX "idx_consultation_appointments_client" ON "consultation_appointments"("clientId");
ALTER TABLE "consultation_appointments" ADD CONSTRAINT "consultation_appointments_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consultation_appointments" ADD CONSTRAINT "consultation_appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "client_report_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointmentId" UUID NOT NULL,
    "stylistId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "revokedAt" TIMESTAMP(6),
    "submissionWindowStart" TIMESTAMP(6),
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_report_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "client_report_tokens_tokenHash_key" UNIQUE ("tokenHash")
);
CREATE INDEX "idx_client_report_tokens_appointment" ON "client_report_tokens"("appointmentId");

CREATE TABLE "client_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointmentId" UUID NOT NULL,
    "tokenId" UUID,
    "stylistId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "fields" JSONB NOT NULL,
    "unknownFields" TEXT[] NOT NULL DEFAULT '{}',
    "serviceConsent" BOOLEAN NOT NULL,
    "featuringConsent" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(6),
    "confirmedBy" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_client_reports_appointment" ON "client_reports"("appointmentId");
CREATE INDEX "idx_client_reports_token" ON "client_reports"("tokenId");

CREATE TABLE "consultation_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointmentId" UUID NOT NULL,
    "stylistId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "fields" JSONB NOT NULL,
    "confirmedReportId" UUID,
    "confirmedBy" UUID,
    "confirmedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consultation_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "consultation_records_appointmentId_key" UNIQUE ("appointmentId")
);
