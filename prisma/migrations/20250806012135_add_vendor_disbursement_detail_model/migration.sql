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
CREATE TABLE "VendorDisbursementDetail" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "vendorPaymentMethod" TEXT,
    "phoneNumberForMPesaPayment" TEXT,
    "managerVerification" TEXT,
    "documentVerifyingPaymentAccount" TEXT,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "phoneNumberForBankAccount" TEXT,
    "paybillNumberAndAccount" TEXT,
    "buyGoodsTill" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VendorDisbursementDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorDisbursementDetail_sheetId_key" ON "VendorDisbursementDetail"("sheetId");
