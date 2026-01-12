/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.
  - The `monthlyTarget` column on the `ssl_staff` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- AlterTable
-- First, add a temporary column with the new type
ALTER TABLE "ssl_staff" ADD COLUMN "monthlyTarget_temp" DOUBLE PRECISION;

-- Convert existing string values to numbers (handles currency formats)
-- Remove all non-numeric characters except dots and minus signs, then convert to number
UPDATE "ssl_staff" 
SET "monthlyTarget_temp" = CASE 
  WHEN "monthlyTarget" IS NULL OR TRIM("monthlyTarget") = '' OR TRIM("monthlyTarget") = '(empty)' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("monthlyTarget"), '[^0-9.-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(
      REGEXP_REPLACE(TRIM("monthlyTarget"), '[^0-9.-]', '', 'g'),
      '^\.|\.$|\.\.+', '', 'g'
    ) AS DOUBLE PRECISION
  )
END;

-- Drop the old column
ALTER TABLE "ssl_staff" DROP COLUMN "monthlyTarget";

-- Rename the temporary column to the original name
ALTER TABLE "ssl_staff" RENAME COLUMN "monthlyTarget_temp" TO "monthlyTarget";
