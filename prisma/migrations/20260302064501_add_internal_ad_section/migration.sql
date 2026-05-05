/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.

  Idempotent: safe when INTERNAL_AD enum value already exists.
*/
DO $$ BEGIN
  ALTER TYPE "BlogSectionType" ADD VALUE 'INTERNAL_AD';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Loan" DROP COLUMN IF EXISTS "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn";
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;
