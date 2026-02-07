-- AlterTable
ALTER TABLE "pipeline_entries" ADD COLUMN IF NOT EXISTS "loan_stage_entered_at" TIMESTAMP(3);

-- Backfill: set loan_stage_entered_at = created_at for existing rows with a loan_stage
UPDATE "pipeline_entries"
SET "loan_stage_entered_at" = "created_at"
WHERE "loan_stage" IS NOT NULL AND "loan_stage_entered_at" IS NULL;
