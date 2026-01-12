-- AlterTable: Convert amount from TEXT to DOUBLE PRECISION
-- This migration handles both cases: TEXT column and already numeric column

DO $$ 
BEGIN
  -- Check if column exists and what type it is
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'principal_tranches' 
    AND column_name = 'amount'
    AND data_type = 'text'
  ) THEN
    -- Column is TEXT, convert it to DOUBLE PRECISION
    
    -- Add temporary column for numeric conversion
    ALTER TABLE "principal_tranches" 
    ADD COLUMN "amount_temp" DOUBLE PRECISION;

    -- Convert existing string values to numbers (handles currency formats)
    -- Remove all non-numeric characters except dots and minus signs, then convert to number
    UPDATE "principal_tranches" 
    SET "amount_temp" = CASE 
      WHEN "amount" IS NULL OR TRIM("amount") = '' OR TRIM("amount") = '(empty)' THEN NULL
      WHEN "amount"::text LIKE '%#%' OR "amount"::text LIKE '%ERROR%' THEN NULL
      WHEN REGEXP_REPLACE(TRIM("amount"::text), '[^0-9.-]', '', 'g') = '' THEN NULL
      ELSE CAST(
        REGEXP_REPLACE(
          REGEXP_REPLACE(TRIM("amount"::text), '[^0-9.-]', '', 'g'),
          '^\.|\.$|\.\.+', '', 'g'
        ) AS DOUBLE PRECISION
      )
    END;

    -- Drop the old TEXT column
    ALTER TABLE "principal_tranches" DROP COLUMN "amount";

    -- Rename the temporary column to the original name
    ALTER TABLE "principal_tranches" RENAME COLUMN "amount_temp" TO "amount";
    
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'principal_tranches' 
    AND column_name = 'amount'
    AND data_type IN ('double precision', 'numeric', 'real')
  ) THEN
    -- Column is already numeric, no conversion needed
    -- Just ensure it's DOUBLE PRECISION (cast if needed)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'principal_tranches' 
      AND column_name = 'amount'
      AND data_type != 'double precision'
    ) THEN
      ALTER TABLE "principal_tranches" 
      ALTER COLUMN "amount" TYPE DOUBLE PRECISION USING "amount"::double precision;
    END IF;
    -- Column is already the correct type, do nothing
  END IF;
END $$;
