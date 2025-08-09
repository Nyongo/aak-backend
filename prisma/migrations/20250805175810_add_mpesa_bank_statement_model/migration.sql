-- CreateTable
CREATE TABLE "MpesaBankStatement" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "personalOrBusinessAccount" TEXT,
    "type" TEXT,
    "accountDetails" TEXT,
    "description" TEXT,
    "statement" TEXT,
    "statementStartDate" TEXT,
    "statementEndDate" TEXT,
    "totalRevenue" DOUBLE PRECISION,
    "convertedExcelFile" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MpesaBankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MpesaBankStatement_sheetId_key" ON "MpesaBankStatement"("sheetId");
