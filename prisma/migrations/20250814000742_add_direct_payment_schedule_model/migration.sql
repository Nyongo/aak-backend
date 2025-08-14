/*
  Warnings:

  - You are about to drop the column `annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT` on the `InvestmentCommittee` table. All the data in the column will be lost.
  - You are about to drop the column `lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol` on the `InvestmentCommittee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CreditApplication" ADD COLUMN     "finalAmountApprovedAndDisbursed" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InvestmentCommittee" DROP COLUMN "annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT",
DROP COLUMN "lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol",
ADD COLUMN     "annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndTransport" TEXT,
ADD COLUMN     "lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCollections" TEXT;

-- CreateTable
CREATE TABLE "DirectPaymentSchedule" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "borrowerId" TEXT,
    "schoolId" TEXT,
    "loanId" TEXT,
    "creditApplicationId" TEXT,
    "paymentScheduleNumber" TEXT,
    "installmentNumber" TEXT,
    "dueDate" TEXT,
    "amountDue" TEXT,
    "principalAmount" TEXT,
    "interestAmount" TEXT,
    "feesAmount" TEXT,
    "penaltyAmount" TEXT,
    "totalAmount" TEXT,
    "paymentStatus" TEXT,
    "paymentMethod" TEXT,
    "paymentDate" TEXT,
    "amountPaid" TEXT,
    "balanceCarriedForward" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DirectPaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectPaymentSchedule_sheetId_key" ON "DirectPaymentSchedule"("sheetId");
