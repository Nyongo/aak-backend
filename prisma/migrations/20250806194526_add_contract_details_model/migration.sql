/*
  Warnings:

  - You are about to drop the column `annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT` on the `InvestmentCommittee` table. All the data in the column will be lost.
  - You are about to drop the column `lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol` on the `InvestmentCommittee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InvestmentCommittee" DROP COLUMN "annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT",
DROP COLUMN "lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol",
ADD COLUMN     "annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndTransport" TEXT,
ADD COLUMN     "lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCollections" TEXT;

-- CreateTable
CREATE TABLE "ContractDetails" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "loanLengthRequestedMonths" TEXT,
    "monthsSchoolRequestsForgiveness" TEXT,
    "disbursalDateRequested" TEXT,
    "tenPercentDownOnVehicleOrLandFinancing" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContractDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractDetails_sheetId_key" ON "ContractDetails"("sheetId");
