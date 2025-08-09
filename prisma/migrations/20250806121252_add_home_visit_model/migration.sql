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
CREATE TABLE "HomeVisit" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "userId" TEXT,
    "county" TEXT,
    "addressDetails" TEXT,
    "locationPin" TEXT,
    "ownOrRent" TEXT,
    "howManyYearsStayed" TEXT,
    "maritalStatus" TEXT,
    "howManyChildren" TEXT,
    "isSpouseInvolvedInSchool" TEXT,
    "doesSpouseHaveOtherIncome" TEXT,
    "ifYesHowMuchPerMonth" TEXT,
    "isDirectorBehindOnUtilityBills" TEXT,
    "totalNumberOfRooms" TEXT,
    "howIsNeighborhood" TEXT,
    "howAccessibleIsHouse" TEXT,
    "isDirectorHomeInSameCity" TEXT,
    "isDirectorTrainedEducator" TEXT,
    "doesDirectorHaveOtherBusiness" TEXT,
    "otherNotes" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HomeVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeVisit_sheetId_key" ON "HomeVisit"("sheetId");
