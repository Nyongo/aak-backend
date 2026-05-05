-- CreateTable
CREATE TABLE "interim_check_ins" (
    "id" TEXT NOT NULL,
    "borrower_id" TEXT NOT NULL,
    "credit_application_id" TEXT NOT NULL,
    "submitted_by_ssl_user_id" TEXT NOT NULL,
    "check_in_kind" TEXT NOT NULL,
    "term_number" INTEGER,
    "term_bucket" INTEGER NOT NULL,
    "survey_version" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interim_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interim_check_ins_credit_application_id_check_in_kind_term_bucket_key" ON "interim_check_ins"("credit_application_id", "check_in_kind", "term_bucket");

-- CreateIndex
CREATE INDEX "interim_check_ins_borrower_id_idx" ON "interim_check_ins"("borrower_id");

-- CreateIndex
CREATE INDEX "interim_check_ins_credit_application_id_idx" ON "interim_check_ins"("credit_application_id");
