/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Loan"
  ADD COLUMN IF NOT EXISTS "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;
ALTER TABLE "Loan" DROP COLUMN IF EXISTS "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn";

-- AlterTable
ALTER TABLE "academy_guide_translations" ADD COLUMN     "bodyContent" JSONB NOT NULL DEFAULT '[]';
