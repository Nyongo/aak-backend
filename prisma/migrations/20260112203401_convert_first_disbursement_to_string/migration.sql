-- Convert firstDisbursement from TIMESTAMP to TEXT (DD/MM/YYYY format)
-- This migration handles the case where firstDisbursement is stored as TIMESTAMP
-- but Prisma schema expects String? (TEXT)

DO $$ 
BEGIN
  -- Check if column exists and is TIMESTAMP type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Loan' 
    AND column_name = 'firstDisbursement'
    AND data_type = 'timestamp without time zone'
  ) THEN
    -- Column is TIMESTAMP, convert it to TEXT
    
    -- Step 1: Add temporary TEXT column
    ALTER TABLE "Loan" 
    ADD COLUMN "firstDisbursement_temp" TEXT;

    -- Step 2: Convert existing TIMESTAMP values to DD/MM/YYYY format strings
    UPDATE "Loan" 
    SET "firstDisbursement_temp" = CASE 
      WHEN "firstDisbursement" IS NULL THEN NULL
      ELSE TO_CHAR("firstDisbursement"::timestamp, 'DD/MM/YYYY')
    END;

    -- Step 3: Drop the old TIMESTAMP column
    ALTER TABLE "Loan" 
    DROP COLUMN "firstDisbursement";

    -- Step 4: Rename the temporary column to firstDisbursement
    ALTER TABLE "Loan" 
    RENAME COLUMN "firstDisbursement_temp" TO "firstDisbursement";
    
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Loan' 
    AND column_name = 'firstDisbursement'
    AND data_type = 'text'
  ) THEN
    -- Column is already TEXT, but might have timestamp-formatted strings
    -- Convert any timestamp-formatted strings to DD/MM/YYYY
    UPDATE "Loan" 
    SET "firstDisbursement" = CASE 
      WHEN "firstDisbursement" IS NULL OR TRIM("firstDisbursement") = '' THEN NULL
      WHEN "firstDisbursement" ~ '^\d{4}-\d{2}-\d{2}' THEN
        -- Format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
        TO_CHAR(("firstDisbursement"::text)::timestamp, 'DD/MM/YYYY')
      ELSE
        -- Already in correct format or other format, keep as is
        "firstDisbursement"
    END;
  END IF;
END $$;
