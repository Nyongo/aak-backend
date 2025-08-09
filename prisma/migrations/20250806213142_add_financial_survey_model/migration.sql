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
CREATE TABLE "FinancialSurvey" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "surveyDate" TEXT,
    "directorId" TEXT,
    "schoolGrades" TEXT,
    "isSchoolAPBETOrPrivate" TEXT,
    "isChurchSupported" TEXT,
    "churchName" TEXT,
    "churchAnnualSupport" TEXT,
    "churchBenefits" TEXT,
    "facilityOwnership" TEXT,
    "annualLeaseRent" TEXT,
    "ownerAnnualWithdrawal" TEXT,
    "monthlyDebtPayments" TEXT,
    "providesMeals" TEXT,
    "termlyFoodExpense" TEXT,
    "termlyFuelExpense" TEXT,
    "annualStudentTextbookExpense" TEXT,
    "annualTeacherTextbookExpense" TEXT,
    "termlyStationeryExpense" TEXT,
    "monthlyWifiExpense" TEXT,
    "termlyAirtimeExpense" TEXT,
    "monthlyWaterExpense" TEXT,
    "termlyMiscExpense" TEXT,
    "annualTaxLicenseExpense" TEXT,
    "monthlyElectricityExpense" TEXT,
    "hasVehicles" TEXT,
    "termlyVehicleServiceExpense" TEXT,
    "termlyVehicleFuelExpense" TEXT,
    "totalVehiclePurchaseExpense" TEXT,
    "annualEquipmentFurnitureExpense" TEXT,
    "annualRepairMaintenanceExpense" TEXT,
    "hasOtherRevenue" TEXT,
    "otherRevenueSources" TEXT,
    "annualOtherRevenue" TEXT,
    "sponsoredChildrenCount" TEXT,
    "annualSponsorshipRevenue" TEXT,
    "lastYearAssetValue" TEXT,
    "lastYearLoanDeposits" TEXT,
    "previousYearStudentCount" TEXT,
    "leaseAgreement" TEXT,
    "receivesSignificantDonations" TEXT,
    "annualDonationRevenue" TEXT,
    "majorProjectsAndMitigation" TEXT,
    "nextYearExpectedStudents" TEXT,
    "twoYearsAgoAssetValue" TEXT,
    "currentBankBalance" TEXT,
    "yearsAtCurrentPremises" TEXT,
    "yearsWithBankAccount" TEXT,
    "hasAuditedFinancials" TEXT,
    "branchCount" TEXT,
    "hasMicrofinanceBorrowing" TEXT,
    "hasFormalBankBorrowing" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FinancialSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialSurvey_sheetId_key" ON "FinancialSurvey"("sheetId");
