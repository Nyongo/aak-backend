/*
  Warnings:

  - You are about to drop the column `annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT` on the `InvestmentCommittee` table. All the data in the column will be lost.
  - You are about to drop the column `lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol` on the `InvestmentCommittee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DirectPaymentSchedule" ADD COLUMN     "address" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "collateralDescription" TEXT,
ADD COLUMN     "collateralType" TEXT,
ADD COLUMN     "collateralValue" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "createdDate" TEXT,
ADD COLUMN     "customerType" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" TEXT,
ADD COLUMN     "isOverdue" TEXT,
ADD COLUMN     "isPaid" TEXT,
ADD COLUMN     "lastModifiedBy" TEXT,
ADD COLUMN     "lastModifiedDate" TEXT,
ADD COLUMN     "lastPaymentDate" TEXT,
ADD COLUMN     "loanAmount" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "monthlyPayment" TEXT,
ADD COLUMN     "nextPaymentDate" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "outstandingBalance" TEXT,
ADD COLUMN     "paymentHistory" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "sslId" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "tags" TEXT,
ADD COLUMN     "totalFees" TEXT,
ADD COLUMN     "totalInterest" TEXT,
ADD COLUMN     "totalPenalties" TEXT;

-- AlterTable
ALTER TABLE "InvestmentCommittee" DROP COLUMN "annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT",
DROP COLUMN "lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol",
ADD COLUMN     "annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndTransport" TEXT,
ADD COLUMN     "lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCollections" TEXT;
