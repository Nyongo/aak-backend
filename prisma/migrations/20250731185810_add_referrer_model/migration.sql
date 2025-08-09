-- CreateTable
CREATE TABLE "Referrer" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "schoolId" TEXT,
    "referrerName" TEXT,
    "mpesaNumber" TEXT,
    "referralRewardPaid" TEXT,
    "datePaid" TEXT,
    "amountPaid" TEXT,
    "proofOfPayment" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Referrer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referrer_sheetId_key" ON "Referrer"("sheetId");
