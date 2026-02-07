-- AlterTable: allow NULL exited_at for "current" stage row (updated by cron)
ALTER TABLE "pipeline_stage_history" ALTER COLUMN "exited_at" DROP NOT NULL;

-- CreateIndex: support finding open rows (exited_at IS NULL) per entry
CREATE INDEX "pipeline_stage_history_pipeline_entry_id_exited_at_idx" ON "pipeline_stage_history"("pipeline_entry_id", "exited_at");
