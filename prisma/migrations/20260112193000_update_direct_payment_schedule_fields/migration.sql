-- AlterTable: Convert fields from TEXT to appropriate types
-- Add temporary columns for conversions
ALTER TABLE "DirectPaymentSchedule" 
ADD COLUMN "amountDue_temp" DOUBLE PRECISION,
ADD COLUMN "amountPaid_temp" DOUBLE PRECISION,
ADD COLUMN "dueDate_temp" TIMESTAMP(3),
ADD COLUMN "daysLate_temp" INTEGER;

-- Convert amountDue: Remove currency symbols, commas, and parse to float
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

-- Convert amountPaid: Remove currency symbols, commas, and parse to float
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

-- Convert dueDate: Parse various date formats to TIMESTAMP
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

-- Convert daysLate: Parse to integer
-- Handle both TEXT and TIMESTAMP types
UPDATE "DirectPaymentSchedule" 
SET "daysLate_temp" = CASE 
  WHEN "daysLate" IS NULL THEN NULL
  -- If it's already a timestamp, we can't convert it meaningfully to days, so set to NULL
  -- (This shouldn't happen, but handle it gracefully)
  WHEN pg_typeof("daysLate")::text LIKE '%timestamp%' THEN NULL
  -- If it's text, parse as integer
  WHEN TRIM("daysLate"::text) = '' OR TRIM("daysLate"::text) = '(empty)' THEN NULL
  WHEN "daysLate"::text LIKE '%#%' OR "daysLate"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("daysLate"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("daysLate"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Drop old columns
ALTER TABLE "DirectPaymentSchedule" 
DROP COLUMN "amountDue",
DROP COLUMN "amountPaid",
DROP COLUMN "dueDate",
DROP COLUMN "daysLate";

-- Rename temporary columns to original names
ALTER TABLE "DirectPaymentSchedule" 
RENAME COLUMN "amountDue_temp" TO "amountDue";
ALTER TABLE "DirectPaymentSchedule" 
RENAME COLUMN "amountPaid_temp" TO "amountPaid";
ALTER TABLE "DirectPaymentSchedule" 
RENAME COLUMN "dueDate_temp" TO "dueDate";
ALTER TABLE "DirectPaymentSchedule" 
RENAME COLUMN "daysLate_temp" TO "daysLate";
