-- CreateTable
CREATE TABLE "pipeline_stage_history" (
    "id" SERIAL NOT NULL,
    "pipeline_entry_id" INTEGER NOT NULL,
    "stage_name" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL,
    "exited_at" TIMESTAMP(3) NOT NULL,
    "was_delayed" BOOLEAN NOT NULL,
    "delay_flag" TEXT,

    CONSTRAINT "pipeline_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_stage_history_pipeline_entry_id_idx" ON "pipeline_stage_history"("pipeline_entry_id");

-- CreateIndex
CREATE INDEX "pipeline_stage_history_stage_name_idx" ON "pipeline_stage_history"("stage_name");

-- CreateIndex
CREATE INDEX "pipeline_stage_history_was_delayed_idx" ON "pipeline_stage_history"("was_delayed");

-- AddForeignKey
ALTER TABLE "pipeline_stage_history" ADD CONSTRAINT "pipeline_stage_history_pipeline_entry_id_fkey" FOREIGN KEY ("pipeline_entry_id") REFERENCES "pipeline_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
