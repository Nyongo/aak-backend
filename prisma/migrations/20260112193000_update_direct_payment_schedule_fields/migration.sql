-- AlterTable: Convert fields from TEXT to appropriate types
-- This migration handles both cases: TEXT columns and already numeric columns

DO $$ 
BEGIN
  -- Check and convert amountDue
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectPaymentSchedule' 
    AND column_name = 'amountDue'
    AND data_type = 'text'
  ) THEN
    -- Column is TEXT, convert it
    ALTER TABLE "DirectPaymentSchedule" 
    ADD COLUMN "amountDue_temp" DOUBLE PRECISION;

    UPDATE "DirectPaymentSchedule" 
    SET "amountDue_temp" = CASE 
      WHEN "amountDue" IS NULL OR TRIM("amountDue") = '' OR TRIM("amountDue") = '(empty)' THEN NULL
      WHEN "amountDue"::text LIKE '%#%' OR "amountDue"::text LIKE '%ERROR%' THEN NULL
      WHEN REGEXP_REPLACE(TRIM("amountDue"::text), '[^0-9.-]', '', 'g') = '' THEN NULL
      ELSE CAST(
        REGEXP_REPLACE(
          REGEXP_REPLACE(TRIM("amountDue"::text), '[^0-9.-]', '', 'g'),
          '^\.|\.$|\.\.+', '', 'g'
        ) AS DOUBLE PRECISION
      )
    END;

    ALTER TABLE "DirectPaymentSchedule" DROP COLUMN "amountDue";
    ALTER TABLE "DirectPaymentSchedule" RENAME COLUMN "amountDue_temp" TO "amountDue";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectPaymentSchedule' 
    AND column_name = 'amountDue'
    AND data_type != 'double precision'
  ) THEN
    -- Column exists but is not double precision, cast it
    ALTER TABLE "DirectPaymentSchedule" 
    ALTER COLUMN "amountDue" TYPE DOUBLE PRECISION USING "amountDue"::double precision;
  END IF;

  -- Check and convert amountPaid
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectPaymentSchedule' 
    AND column_name = 'amountPaid'
    AND data_type = 'text'
  ) THEN
    -- Column is TEXT, convert it
    ALTER TABLE "DirectPaymentSchedule" 
    ADD COLUMN "amountPaid_temp" DOUBLE PRECISION;

    UPDATE "DirectPaymentSchedule" 
    SET "amountPaid_temp" = CASE 
      WHEN "amountPaid" IS NULL OR TRIM("amountPaid") = '' OR TRIM("amountPaid") = '(empty)' THEN NULL
      WHEN "amountPaid"::text LIKE '%#%' OR "amountPaid"::text LIKE '%ERROR%' THEN NULL
      WHEN REGEXP_REPLACE(TRIM("amountPaid"::text), '[^0-9.-]', '', 'g') = '' THEN NULL
      ELSE CAST(
        REGEXP_REPLACE(
          REGEXP_REPLACE(TRIM("amountPaid"::text), '[^0-9.-]', '', 'g'),
          '^\.|\.$|\.\.+', '', 'g'
        ) AS DOUBLE PRECISION
      )
    END;

    ALTER TABLE "DirectPaymentSchedule" DROP COLUMN "amountPaid";
    ALTER TABLE "DirectPaymentSchedule" RENAME COLUMN "amountPaid_temp" TO "amountPaid";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectPaymentSchedule' 
    AND column_name = 'amountPaid'
    AND data_type != 'double precision'
  ) THEN
    -- Column exists but is not double precision, cast it
    ALTER TABLE "DirectPaymentSchedule" 
    ALTER COLUMN "amountPaid" TYPE DOUBLE PRECISION USING "amountPaid"::double precision;
  END IF;
END $$;

-- Add temporary columns for dueDate and daysLate (if they don't already exist)
ALTER TABLE "DirectPaymentSchedule" 
ADD COLUMN IF NOT EXISTS "dueDate_temp" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "daysLate_temp" INTEGER;

-- Convert dueDate: Parse various date formats to TIMESTAMP
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectPaymentSchedule' 
    AND column_name = 'dueDate'
    AND data_type = 'text'
  ) THEN
    UPDATE "DirectPaymentSchedule" 
    SET "dueDate_temp" = CASE 
      WHEN "dueDate" IS NULL OR TRIM("dueDate") = '' OR TRIM("dueDate") = '(empty)' THEN NULL
      WHEN "dueDate"::text LIKE '%#%' OR "dueDate"::text LIKE '%ERROR%' THEN NULL
      ELSE 
        CASE 
          WHEN "dueDate"::text ~ '^\d{4}-\d{2}-\d{2}' THEN "dueDate"::timestamp
          WHEN "dueDate"::text ~ '^\d{1,2}/\d{1,2}/\d{4}' THEN TO_TIMESTAMP("dueDate"::text, 'MM/DD/YYYY')
          WHEN "dueDate"::text ~ '^\d{1,2}-\d{1,2}-\d{4}' THEN TO_TIMESTAMP("dueDate"::text, 'MM-DD-YYYY')
          ELSE NULL
        END
    END;

    ALTER TABLE "DirectPaymentSchedule" DROP COLUMN "dueDate";
    ALTER TABLE "DirectPaymentSchedule" RENAME COLUMN "dueDate_temp" TO "dueDate";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectPaymentSchedule' 
    AND column_name = 'dueDate'
    AND data_type != 'timestamp without time zone'
  ) THEN
    ALTER TABLE "DirectPaymentSchedule" 
    ALTER COLUMN "dueDate" TYPE TIMESTAMP(3) USING "dueDate"::timestamp;
  END IF;
END $$;

-- Convert daysLate: Parse to integer
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectPaymentSchedule' 
    AND column_name = 'daysLate'
    AND data_type = 'text'
  ) THEN
    UPDATE "DirectPaymentSchedule" 
    SET "daysLate_temp" = CASE 
      WHEN "daysLate" IS NULL OR TRIM("daysLate") = '' OR TRIM("daysLate") = '(empty)' THEN NULL
      WHEN "daysLate"::text LIKE '%#%' OR "daysLate"::text LIKE '%ERROR%' THEN NULL
      WHEN REGEXP_REPLACE(TRIM("daysLate"::text), '[^0-9-]', '', 'g') = '' THEN NULL
      ELSE CAST(
        REGEXP_REPLACE(TRIM("daysLate"::text), '[^0-9-]', '', 'g') AS INTEGER
      )
    END;

    ALTER TABLE "DirectPaymentSchedule" DROP COLUMN "daysLate";
    ALTER TABLE "DirectPaymentSchedule" RENAME COLUMN "daysLate_temp" TO "daysLate";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectPaymentSchedule' 
    AND column_name = 'daysLate'
    AND data_type = 'timestamp without time zone'
  ) THEN
    -- If it's a timestamp (from previous migration), convert to integer (days)
    ALTER TABLE "DirectPaymentSchedule" 
    ADD COLUMN IF NOT EXISTS "daysLate_temp" INTEGER;

    UPDATE "DirectPaymentSchedule" 
    SET "daysLate_temp" = NULL; -- Can't meaningfully convert timestamp to days

    ALTER TABLE "DirectPaymentSchedule" DROP COLUMN "daysLate";
    ALTER TABLE "DirectPaymentSchedule" RENAME COLUMN "daysLate_temp" TO "daysLate";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'DirectPaymentSchedule' 
    AND column_name = 'daysLate'
    AND data_type != 'integer'
  ) THEN
    ALTER TABLE "DirectPaymentSchedule" 
    ALTER COLUMN "daysLate" TYPE INTEGER USING "daysLate"::integer;
  END IF;
END $$;
