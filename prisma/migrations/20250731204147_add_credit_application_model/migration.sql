-- CreateTable
CREATE TABLE "CreditApplication" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "customerType" TEXT,
    "borrowerId" TEXT,
    "applicationStartDate" TEXT,
    "creditType" TEXT,
    "totalAmountRequested" TEXT,
    "workingCapitalApplicationNumber" TEXT,
    "sslActionNeeded" TEXT,
    "sslAction" TEXT,
    "sslId" TEXT,
    "sslFeedbackOnAction" TEXT,
    "schoolCrbAvailable" TEXT,
    "referredBy" TEXT,
    "currentCostOfCapital" TEXT,
    "checksCollected" TEXT,
    "checksNeededForLoan" TEXT,
    "photoOfCheck" TEXT,
    "status" TEXT,
    "commentsOnChecks" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CreditApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditApplication_sheetId_key" ON "CreditApplication"("sheetId");
