-- AlterTable: Convert amount from TEXT to DOUBLE PRECISION
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

-- Drop the old column
ALTER TABLE "principal_tranches" DROP COLUMN "amount";

-- Rename the temporary column to the original name
ALTER TABLE "principal_tranches" RENAME COLUMN "amount_temp" TO "amount";
