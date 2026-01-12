-- Convert initialDisbursementDateInContract from TEXT to TIMESTAMP
-- This migration converts the column from TEXT to TIMESTAMP(3) (DateTime)

DO $$ 
BEGIN
  -- Check if column exists and is TEXT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'principal_tranches' 
    AND column_name = 'initialDisbursementDateInContract'
    AND data_type = 'text'
  ) THEN
    -- Column is TEXT, convert it to TIMESTAMP(3)
    
    -- Step 1: Add temporary TIMESTAMP column
    ALTER TABLE "principal_tranches" 
    ADD COLUMN "initialDisbursementDateInContract_temp" TIMESTAMP(3);

    -- Step 2: Convert existing TEXT values to TIMESTAMP
    -- Handle various date formats from the sheet
    UPDATE "principal_tranches" 
    SET "initialDisbursementDateInContract_temp" = CASE 
      WHEN "initialDisbursementDateInContract" IS NULL OR TRIM("initialDisbursementDateInContract") = '' OR TRIM("initialDisbursementDateInContract") = '(empty)' THEN NULL
      WHEN "initialDisbursementDateInContract"::text LIKE '%#%' OR "initialDisbursementDateInContract"::text LIKE '%ERROR%' THEN NULL
      -- Already in timestamp format (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
      WHEN "initialDisbursementDateInContract" ~ '^\d{4}-\d{2}-\d{2}' THEN
        ("initialDisbursementDateInContract"::text)::timestamp
      -- "Month DD, YYYY" format (e.g., "May 5, 2022")
      WHEN "initialDisbursementDateInContract" ~ '^[A-Za-z]+\s+\d{1,2},\s+\d{4}$' THEN
        TO_TIMESTAMP("initialDisbursementDateInContract"::text, 'FMMonth DD, YYYY')
      -- Try to parse as generic timestamp
      ELSE
        CASE 
          WHEN ("initialDisbursementDateInContract"::text)::timestamp IS NOT NULL THEN
            ("initialDisbursementDateInContract"::text)::timestamp
          ELSE
            NULL
        END
    END;

    -- Step 3: Drop the old TEXT column
    ALTER TABLE "principal_tranches" 
    DROP COLUMN "initialDisbursementDateInContract";

    -- Step 4: Rename the temporary column
    ALTER TABLE "principal_tranches" 
    RENAME COLUMN "initialDisbursementDateInContract_temp" TO "initialDisbursementDateInContract";
    
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'principal_tranches' 
    AND column_name = 'initialDisbursementDateInContract'
    AND data_type != 'timestamp without time zone'
  ) THEN
    -- Column exists but is not TIMESTAMP, convert it
    ALTER TABLE "principal_tranches" 
    ALTER COLUMN "initialDisbursementDateInContract" TYPE TIMESTAMP(3) USING "initialDisbursementDateInContract"::timestamp;
  END IF;
END $$;
