-- Patch test & allergy tracking + formula accuracy analytics
-- Date: 2026-10-12

CREATE TABLE "client_patch_tests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "salon_id" UUID,
  "test_date" DATE NOT NULL,
  "product_brand" VARCHAR(100),
  "product_shade" VARCHAR(50),
  "result" VARCHAR(20) NOT NULL,
  "notes" TEXT,
  "tested_by" UUID,
  "expiry_date" DATE,
  "created_at" TIMESTAMP(6) DEFAULT now(),
  CONSTRAINT "client_patch_tests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_patch_tests_client" ON "client_patch_tests"("client_id");
CREATE INDEX "idx_patch_tests_client_date" ON "client_patch_tests"("client_id", "test_date" DESC);

ALTER TABLE "client_patch_tests"
  ADD CONSTRAINT "client_patch_tests_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "client_allergies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "client_id" UUID NOT NULL,
  "allergen" VARCHAR(100) NOT NULL,
  "severity" VARCHAR(20) NOT NULL,
  "notes" TEXT,
  "recorded_by" UUID,
  "created_at" TIMESTAMP(6) DEFAULT now(),
  CONSTRAINT "client_allergies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_client_allergies_client" ON "client_allergies"("client_id");

ALTER TABLE "client_allergies"
  ADD CONSTRAINT "client_allergies_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE "formula_accuracy" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "formulation_id" UUID,
  "formula_id" UUID,
  "client_id" UUID,
  "stylist_id" UUID,
  "salon_id" UUID,
  "service_type" VARCHAR(50),
  "predicted_level" INTEGER,
  "actual_level" INTEGER,
  "predicted_tone" VARCHAR(50),
  "actual_tone" VARCHAR(50),
  "outcome" VARCHAR(20) NOT NULL,
  "rating" INTEGER,
  "adjustment_notes" TEXT,
  "needs_retraining" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP(6) DEFAULT now(),
  CONSTRAINT "formula_accuracy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_formula_accuracy_formulation" ON "formula_accuracy"("formulation_id");
CREATE INDEX "idx_formula_accuracy_salon" ON "formula_accuracy"("salon_id");
CREATE INDEX "idx_formula_accuracy_salon_date" ON "formula_accuracy"("salon_id", "created_at" DESC);
CREATE INDEX "idx_formula_accuracy_service" ON "formula_accuracy"("service_type");
