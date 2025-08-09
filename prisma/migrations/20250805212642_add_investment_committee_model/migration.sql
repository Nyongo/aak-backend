-- CreateTable
CREATE TABLE "InvestmentCommittee" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "auditedFinancialsProvided" TEXT,
    "schoolHasBankAccountAndChecks" TEXT,
    "annualRevenueFromBankaAndMPesaStatements" TEXT,
    "totalCashHeldInBankAndMPesaAccounts" TEXT,
    "debtRatio" TEXT,
    "loanLengthMonths" TEXT,
    "annualReducingInterestRate" TEXT,
    "totalEstimatedValueOfAssets" TEXT,
    "predictedDaysLate" INTEGER,
    "averageBankBalance" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InvestmentCommittee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentCommittee_sheetId_key" ON "InvestmentCommittee"("sheetId");
