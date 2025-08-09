-- CreateTable
CREATE TABLE "ActiveDebt" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "debtStatus" TEXT,
    "listedOnCrb" TEXT,
    "personalLoanOrSchoolLoan" TEXT,
    "lender" TEXT,
    "dateLoanTaken" TEXT,
    "finalDueDate" TEXT,
    "totalLoanAmount" DOUBLE PRECISION,
    "balance" DOUBLE PRECISION,
    "amountOverdue" DOUBLE PRECISION,
    "monthlyPayment" DOUBLE PRECISION,
    "debtStatement" TEXT,
    "annualDecliningBalanceInterestRate" DOUBLE PRECISION,
    "isLoanCollateralized" TEXT,
    "typeOfCollateral" TEXT,
    "whatWasLoanUsedFor" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ActiveDebt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActiveDebt_sheetId_key" ON "ActiveDebt"("sheetId");
