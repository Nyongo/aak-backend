-- DropIndex
DROP INDEX IF EXISTS "pipeline_entries_pipeline_entry_date_idx";

-- AlterTable
ALTER TABLE "pipeline_entries" DROP COLUMN IF EXISTS "pipeline_entry_date";

-- CreateIndex
CREATE INDEX "pipeline_entries_created_at_idx" ON "pipeline_entries"("created_at");
