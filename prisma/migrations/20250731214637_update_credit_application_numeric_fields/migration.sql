/*
  Warnings:

  - The `totalAmountRequested` column on the `CreditApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currentCostOfCapital` column on the `CreditApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `checksCollected` column on the `CreditApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `checksNeededForLoan` column on the `CreditApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "CreditApplication" DROP COLUMN "totalAmountRequested",
ADD COLUMN     "totalAmountRequested" DOUBLE PRECISION,
DROP COLUMN "currentCostOfCapital",
ADD COLUMN     "currentCostOfCapital" DOUBLE PRECISION,
DROP COLUMN "checksCollected",
ADD COLUMN     "checksCollected" DOUBLE PRECISION,
DROP COLUMN "checksNeededForLoan",
ADD COLUMN     "checksNeededForLoan" DOUBLE PRECISION;
