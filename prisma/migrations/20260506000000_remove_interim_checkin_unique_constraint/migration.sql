-- Remove the unique constraint that prevented multiple check-ins per application/kind/term.
-- Multiple surveys for the same borrower+application over time are now allowed.
DROP INDEX "interim_check_ins_credit_application_id_check_in_kind_term_bucket_key";

-- Drop term_bucket — it was only needed as a NULL-safe surrogate for the unique index.
ALTER TABLE "interim_check_ins" DROP COLUMN "term_bucket";
