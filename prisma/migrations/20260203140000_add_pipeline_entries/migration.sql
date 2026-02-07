-- CreateTable
CREATE TABLE "pipeline_entries" (
    "id" SERIAL NOT NULL,
    "clientType" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "clientTel" TEXT,
    "sector" TEXT,
    "product" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isTopUp" BOOLEAN NOT NULL DEFAULT false,
    "cross_sell_opportunities" TEXT,
    "ssl_staff_id" TEXT,
    "region" TEXT,
    "loan_stage" TEXT,
    "pipeline_entry_date" TIMESTAMP(3) NOT NULL,
    "estimated_closing" TIMESTAMP(3),
    "probability_of_closing" INTEGER,
    "expected_disbursement" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,

    CONSTRAINT "pipeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_entries_entityName_idx" ON "pipeline_entries"("entityName");

-- CreateIndex
CREATE INDEX "pipeline_entries_clientTel_idx" ON "pipeline_entries"("clientTel");

-- CreateIndex
CREATE INDEX "pipeline_entries_status_idx" ON "pipeline_entries"("status");

-- CreateIndex
CREATE INDEX "pipeline_entries_pipeline_entry_date_idx" ON "pipeline_entries"("pipeline_entry_date");

-- CreateIndex
CREATE INDEX "pipeline_entries_estimated_closing_idx" ON "pipeline_entries"("estimated_closing");

-- CreateIndex
CREATE INDEX "pipeline_entries_ssl_staff_id_idx" ON "pipeline_entries"("ssl_staff_id");

-- AddForeignKey
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_ssl_staff_id_fkey" FOREIGN KEY ("ssl_staff_id") REFERENCES "ssl_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
