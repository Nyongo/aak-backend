/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- CreateTable
CREATE TABLE "collateral" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "directLoanId" TEXT,
    "schoolId" TEXT,
    "type" TEXT,
    "description" TEXT,
    "originalTitleDeedCollected" TEXT,
    "originalTitleDeedPhoto" TEXT,
    "titleNumber" TEXT,
    "landSecuritizationComplete" TEXT,
    "vehicleLicensePlateDetails" TEXT,
    "comprehensiveInsuranceRegistered" TEXT,
    "comprehensiveInsuranceThrough" TEXT,
    "comprehensiveInsuranceCoverageImage" TEXT,
    "financiersInterestedRegistered" TEXT,
    "confirmationOfFinanciersInterest" TEXT,
    "originalLogbookCollected" TEXT,
    "ownershipAcceptedOnNtsaPortal" TEXT,
    "newLogbookCollected" TEXT,
    "uploadOfLogbookIssuedAfterJointTransfer" TEXT,
    "photoOfLogbookIssuedAfterJointTransfer" TEXT,
    "trackerInstalled" TEXT,
    "cc" TEXT,
    "yearOfManufacture" TEXT,
    "comprehensiveInsuranceExpirationDate" TEXT,
    "evaluatorsReport" TEXT,
    "evaluatorsAssessedMarketValueKes" TEXT,
    "evaluatorsAssessedForcedValueKes" TEXT,
    "legalOwnerOfCollateral" TEXT,
    "userId" TEXT,
    "fullOwnerDetails" TEXT,
    "percentComplete" TEXT,
    "originalOrNewTitlesHeld" TEXT,
    "createdAtSheet" TEXT,
    "createdBy" TEXT,
    "reasonDeedNotHeldIfMissing" TEXT,
    "landChargesHeld" TEXT,
    "chargeStatusId" TEXT,
    "instructions" TEXT,
    "clerkAssigned" TEXT,
    "dateCollateralSecured" TEXT,
    "schoolSitsOnLand" TEXT,
    "collateralOwnedByDirectorOfSchool" TEXT,
    "status" TEXT,
    "sslId" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "collateral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collateral_loan" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "collateralId" TEXT,
    "loanId" TEXT,
    "school" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "collateral_loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sme_calculator_results" (
    "id" SERIAL NOT NULL,
    "clientName" TEXT NOT NULL,
    "sales" DOUBLE PRECISION NOT NULL,
    "verifiedSales" DOUBLE PRECISION NOT NULL,
    "costOfSales" DOUBLE PRECISION NOT NULL,
    "rent" DOUBLE PRECISION NOT NULL,
    "utilities" DOUBLE PRECISION NOT NULL,
    "labour" DOUBLE PRECISION NOT NULL,
    "transport" DOUBLE PRECISION NOT NULL,
    "tradingLicense" DOUBLE PRECISION NOT NULL,
    "otherExpenses" DOUBLE PRECISION NOT NULL,
    "otherIncome" DOUBLE PRECISION NOT NULL,
    "householdExpenses" DOUBLE PRECISION NOT NULL,
    "otherDebtPayments" DOUBLE PRECISION NOT NULL,
    "selectedProduct" TEXT NOT NULL,
    "proposedLoan" DOUBLE PRECISION NOT NULL,
    "tenor" INTEGER NOT NULL,
    "applyStress" BOOLEAN NOT NULL,
    "effectiveRevenues" DOUBLE PRECISION NOT NULL,
    "grossProfit" DOUBLE PRECISION NOT NULL,
    "operatingExpenses" DOUBLE PRECISION NOT NULL,
    "netBusinessIncome" DOUBLE PRECISION NOT NULL,
    "householdDeduction" DOUBLE PRECISION NOT NULL,
    "netDisposableIncome" DOUBLE PRECISION NOT NULL,
    "monthlyInstallment" DOUBLE PRECISION NOT NULL,
    "debtServiceRatio" DOUBLE PRECISION NOT NULL,
    "maxMonthlyPayment" DOUBLE PRECISION NOT NULL,
    "maxLoanAffordability" DOUBLE PRECISION NOT NULL,
    "rawResults" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sme_calculator_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collateral_sheetId_key" ON "collateral"("sheetId");

-- CreateIndex
CREATE UNIQUE INDEX "collateral_loan_sheetId_key" ON "collateral_loan"("sheetId");
