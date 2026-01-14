-- Convert Loan.firstDisbursement from TEXT (DD/MM/YYYY or other formats) to TIMESTAMP(3)
-- This aligns the database with the Prisma schema where firstDisbursement is DateTime?

DO $$
BEGIN
  -- If the column exists as TEXT, convert its values into a TIMESTAMP(3) column
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Loan'
      AND column_name = 'firstDisbursement'
      AND data_type = 'text'
  ) THEN
    -- Add temporary TIMESTAMP column
    ALTER TABLE "Loan"
      ADD COLUMN "firstDisbursement_temp" TIMESTAMP(3);

    -- Convert existing text values to timestamp
    UPDATE "Loan"
    SET "firstDisbursement_temp" = CASE
      WHEN "firstDisbursement" IS NULL
        OR TRIM("firstDisbursement") = ''
        OR TRIM("firstDisbursement") = '(empty)' THEN NULL

      -- ISO-like format: 2025-12-22 or 2025-12-22 00:00:00
      WHEN "firstDisbursement" ~ '^\d{4}-\d{2}-\d{2}' THEN
        ("firstDisbursement"::text)::timestamp

      -- DD/MM/YYYY (our standard from previous migration and sheets)
      WHEN "firstDisbursement" ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
        TO_TIMESTAMP("firstDisbursement"::text, 'DD/MM/YYYY')

      -- DD-MM-YYYY
      WHEN "firstDisbursement" ~ '^\d{1,2}-\d{1,2}-\d{4}$' THEN
        TO_TIMESTAMP("firstDisbursement"::text, 'DD-MM-YYYY')

      -- Month DD, YYYY (e.g. May 13, 2022)
      WHEN "firstDisbursement" ~ '^[A-Za-z]+\s+\d{1,2},\s+\d{4}$' THEN
        TO_TIMESTAMP("firstDisbursement"::text, 'FMMonth DD, YYYY')

      ELSE NULL
    END;

    -- Drop old TEXT column and rename temp to original name
    ALTER TABLE "Loan"
      DROP COLUMN "firstDisbursement";

    ALTER TABLE "Loan"
      RENAME COLUMN "firstDisbursement_temp" TO "firstDisbursement";

  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Loan'
      AND column_name = 'firstDisbursement'
      AND data_type != 'timestamp without time zone'
  ) THEN
    -- If the column exists but is not yet timestamp, cast it defensively
    ALTER TABLE "Loan"
      ALTER COLUMN "firstDisbursement"
      TYPE TIMESTAMP(3)
      USING NULLIF("firstDisbursement"::text, '')::timestamp;
  END IF;
END $$;

