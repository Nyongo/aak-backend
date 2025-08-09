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
CREATE TABLE "AssetTitle" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "type" TEXT,
    "toBeUsedAsSecurity" TEXT,
    "description" TEXT,
    "legalOwner" TEXT,
    "userId" TEXT,
    "fullOwnerDetails" TEXT,
    "collateralOwnedByDirectorOfSchool" TEXT,
    "plotNumber" TEXT,
    "schoolSitsOnLand" TEXT,
    "hasComprehensiveInsurance" TEXT,
    "originalInsuranceCoverage" TEXT,
    "initialEstimatedValue" TEXT,
    "approvedByLegalTeamOrNTSAAgent" TEXT,
    "notesOnApprovalForUse" TEXT,
    "evaluatorsMarketValue" TEXT,
    "evaluatorsForcedValue" TEXT,
    "moneyOwedOnAsset" TEXT,
    "licensePlateNumber" TEXT,
    "engineCC" TEXT,
    "yearOfManufacture" TEXT,
    "logbookPhoto" TEXT,
    "titleDeedPhoto" TEXT,
    "fullTitleDeed" TEXT,
    "evaluatorsReport" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AssetTitle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetTitle_sheetId_key" ON "AssetTitle"("sheetId");
