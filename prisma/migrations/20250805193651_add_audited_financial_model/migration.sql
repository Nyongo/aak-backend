-- CreateTable
CREATE TABLE "AuditedFinancial" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "statementType" TEXT,
    "notes" TEXT,
    "file" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AuditedFinancial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditedFinancial_sheetId_key" ON "AuditedFinancial"("sheetId");
