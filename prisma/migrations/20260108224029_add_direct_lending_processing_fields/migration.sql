/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- CreateTable
CREATE TABLE "direct_lending_processing" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "paymentType" TEXT,
    "paymentSource" TEXT,
    "borrowerType" TEXT,
    "borrowerId" TEXT,
    "directLoanId" TEXT,
    "paymentScheduleId" TEXT,
    "paymentDate" TEXT,
    "amountPaid" TEXT,
    "paymentReferenceOrTransactionCode" TEXT,
    "installmentPaymentAmount" TEXT,
    "installmentVehicleInsurancePremiumAmount" TEXT,
    "installmentVehicleInsuranceSurchargeAmount" TEXT,
    "installmentInterestAmount" TEXT,
    "installmentPrincipalAmount" TEXT,
    "vehicleInsurancePremiumPaid" TEXT,
    "vehicleInsuranceSurchargePaid" TEXT,
    "interestPaid" TEXT,
    "principalPaid" TEXT,
    "createdBy" TEXT,
    "sslId" TEXT,
    "region" TEXT,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_lending_processing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "direct_lending_processing_sheetId_key" ON "direct_lending_processing"("sheetId");
