-- AlterTable
ALTER TABLE "pipeline_entries" ADD COLUMN "top_up_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
