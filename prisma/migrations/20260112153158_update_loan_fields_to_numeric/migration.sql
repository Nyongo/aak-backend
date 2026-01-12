-- AlterTable: Fix column name first (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Loan' 
    AND column_name = 'totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn'
  ) THEN
    ALTER TABLE "Loan" 
    DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn";
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Loan' 
    AND column_name = 'totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance'
  ) THEN
    ALTER TABLE "Loan" 
    ADD COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;
  END IF;
END $$;

-- Add temporary columns for numeric conversions
ALTER TABLE "Loan" 
ADD COLUMN "principalAmount_temp" DOUBLE PRECISION,
ADD COLUMN "numberOfMonths_temp" INTEGER,
ADD COLUMN "outstandingPrincipalBalance_temp" DOUBLE PRECISION,
ADD COLUMN "daysLate_temp" INTEGER,
ADD COLUMN "hasFemaleDirector_temp" INTEGER,
ADD COLUMN "outstandingInterestBalance_temp" DOUBLE PRECISION;

-- Convert principalAmount: Remove currency symbols, commas, and parse to float
UPDATE "Loan" 
SET "principalAmount_temp" = CASE 
  WHEN "principalAmount" IS NULL OR TRIM("principalAmount") = '' OR TRIM("principalAmount") = '(empty)' THEN NULL
  WHEN "principalAmount"::text LIKE '%#%' OR "principalAmount"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("principalAmount"::text), '[^0-9.-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(
      REGEXP_REPLACE(TRIM("principalAmount"::text), '[^0-9.-]', '', 'g'),
      '^\.|\.$|\.\.+', '', 'g'
    ) AS DOUBLE PRECISION
  )
END;

-- Convert numberOfMonths: Parse to integer
UPDATE "Loan" 
SET "numberOfMonths_temp" = CASE 
  WHEN "numberOfMonths" IS NULL OR TRIM("numberOfMonths") = '' OR TRIM("numberOfMonths") = '(empty)' THEN NULL
  WHEN "numberOfMonths"::text LIKE '%#%' OR "numberOfMonths"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("numberOfMonths"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("numberOfMonths"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert outstandingPrincipalBalance: Remove currency symbols, commas, and parse to float
UPDATE "Loan" 
SET "outstandingPrincipalBalance_temp" = CASE 
  WHEN "outstandingPrincipalBalance" IS NULL OR TRIM("outstandingPrincipalBalance") = '' OR TRIM("outstandingPrincipalBalance") = '(empty)' THEN NULL
  WHEN "outstandingPrincipalBalance"::text LIKE '%#%' OR "outstandingPrincipalBalance"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("outstandingPrincipalBalance"::text), '[^0-9.-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(
      REGEXP_REPLACE(TRIM("outstandingPrincipalBalance"::text), '[^0-9.-]', '', 'g'),
      '^\.|\.$|\.\.+', '', 'g'
    ) AS DOUBLE PRECISION
  )
END;

-- Convert daysLate: Parse to integer
UPDATE "Loan" 
SET "daysLate_temp" = CASE 
  WHEN "daysLate" IS NULL OR TRIM("daysLate") = '' OR TRIM("daysLate") = '(empty)' THEN NULL
  WHEN "daysLate"::text LIKE '%#%' OR "daysLate"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("daysLate"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("daysLate"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert hasFemaleDirector: Parse boolean/yes-no to integer (0 or 1)
UPDATE "Loan" 
SET "hasFemaleDirector_temp" = CASE 
  WHEN "hasFemaleDirector" IS NULL OR TRIM("hasFemaleDirector") = '' OR TRIM("hasFemaleDirector") = '(empty)' THEN NULL
  WHEN LOWER(TRIM("hasFemaleDirector"::text)) IN ('true', 'yes', '1') THEN 1
  WHEN LOWER(TRIM("hasFemaleDirector"::text)) IN ('false', 'no', '0') THEN 0
  WHEN REGEXP_REPLACE(TRIM("hasFemaleDirector"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("hasFemaleDirector"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert outstandingInterestBalance: Remove currency symbols, commas, and parse to float
UPDATE "Loan" 
SET "outstandingInterestBalance_temp" = CASE 
  WHEN "outstandingInterestBalance" IS NULL OR TRIM("outstandingInterestBalance") = '' OR TRIM("outstandingInterestBalance") = '(empty)' THEN NULL
  WHEN "outstandingInterestBalance"::text LIKE '%#%' OR "outstandingInterestBalance"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("outstandingInterestBalance"::text), '[^0-9.-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(
      REGEXP_REPLACE(TRIM("outstandingInterestBalance"::text), '[^0-9.-]', '', 'g'),
      '^\.|\.$|\.\.+', '', 'g'
    ) AS DOUBLE PRECISION
  )
END;

-- Drop old columns
ALTER TABLE "Loan" 
DROP COLUMN "principalAmount",
DROP COLUMN "numberOfMonths",
DROP COLUMN "outstandingPrincipalBalance",
DROP COLUMN "daysLate",
DROP COLUMN "hasFemaleDirector",
DROP COLUMN "outstandingInterestBalance";

-- Rename temporary columns to original names
ALTER TABLE "Loan" 
RENAME COLUMN "principalAmount_temp" TO "principalAmount";
ALTER TABLE "Loan" 
RENAME COLUMN "numberOfMonths_temp" TO "numberOfMonths";
ALTER TABLE "Loan" 
RENAME COLUMN "outstandingPrincipalBalance_temp" TO "outstandingPrincipalBalance";
ALTER TABLE "Loan" 
RENAME COLUMN "daysLate_temp" TO "daysLate";
ALTER TABLE "Loan" 
RENAME COLUMN "hasFemaleDirector_temp" TO "hasFemaleDirector";
ALTER TABLE "Loan" 
RENAME COLUMN "outstandingInterestBalance_temp" TO "outstandingInterestBalance";
