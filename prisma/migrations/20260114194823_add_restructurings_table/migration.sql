-- CreateTable
CREATE TABLE "restructurings" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "loanId" TEXT,
    "date" TIMESTAMP(3),
    "restructuringDate" TEXT,
    "reason" TEXT,
    "previousLoanTerms" TEXT,
    "newLoanTerms" TEXT,
    "previousPrincipalAmount" DOUBLE PRECISION,
    "newPrincipalAmount" DOUBLE PRECISION,
    "previousInterestRate" TEXT,
    "newInterestRate" TEXT,
    "previousNumberOfMonths" INTEGER,
    "newNumberOfMonths" INTEGER,
    "previousMonthlyPayment" DOUBLE PRECISION,
    "newMonthlyPayment" DOUBLE PRECISION,
    "approvedBy" TEXT,
    "approvalDate" TEXT,
    "createdAtSheet" TEXT,
    "createdBy" TEXT,
    "region" TEXT,
    "sslId" TEXT,
    "notes" TEXT,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restructurings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restructurings_sheetId_key" ON "restructurings"("sheetId");
