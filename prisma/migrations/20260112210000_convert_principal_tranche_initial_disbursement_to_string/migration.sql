-- Convert initialDisbursementDateInContract from TIMESTAMP to TEXT (Month DD, YYYY format)
-- This migration handles the case where initialDisbursementDateInContract is stored as TIMESTAMP
-- but Prisma schema expects String? (TEXT) in "Month DD, YYYY" format

DO $$ 
BEGIN
  -- Check if column exists and is TIMESTAMP type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'principal_tranches' 
    AND column_name = 'initialDisbursementDateInContract'
    AND data_type = 'timestamp without time zone'
  ) THEN
    -- Column is TIMESTAMP, convert it to TEXT with "Month DD, YYYY" format
    
    -- Step 1: Add temporary TEXT column
    ALTER TABLE "principal_tranches" 
    ADD COLUMN "initialDisbursementDateInContract_temp" TEXT;

    -- Step 2: Convert existing TIMESTAMP values to "Month DD, YYYY" format strings
    -- Using FM prefix to remove extra spaces from month name
    UPDATE "principal_tranches" 
    SET "initialDisbursementDateInContract_temp" = CASE 
      WHEN "initialDisbursementDateInContract" IS NULL THEN NULL
      ELSE TRIM(TO_CHAR("initialDisbursementDateInContract"::timestamp, 'FMMonth DD, YYYY'))
    END;

    -- Step 3: Drop the old TIMESTAMP column
    ALTER TABLE "principal_tranches" 
    DROP COLUMN "initialDisbursementDateInContract";

    -- Step 4: Rename the temporary column to initialDisbursementDateInContract
    ALTER TABLE "principal_tranches" 
    RENAME COLUMN "initialDisbursementDateInContract_temp" TO "initialDisbursementDateInContract";
    
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'principal_tranches' 
    AND column_name = 'initialDisbursementDateInContract'
    AND data_type = 'text'
  ) THEN
    -- Column is already TEXT, but might have timestamp-formatted strings
    -- Convert any timestamp-formatted strings to "Month DD, YYYY"
    UPDATE "principal_tranches" 
    SET "initialDisbursementDateInContract" = CASE 
      WHEN "initialDisbursementDateInContract" IS NULL OR TRIM("initialDisbursementDateInContract") = '' THEN NULL
      WHEN "initialDisbursementDateInContract" ~ '^\d{4}-\d{2}-\d{2}' THEN
        -- Format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
        TRIM(TO_CHAR(("initialDisbursementDateInContract"::text)::timestamp, 'FMMonth DD, YYYY'))
      ELSE
        -- Already in correct format or other format, keep as is
        "initialDisbursementDateInContract"
    END;
  END IF;
END $$;
