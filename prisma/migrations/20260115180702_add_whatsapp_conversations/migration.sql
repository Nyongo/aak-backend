/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- CreateTable
CREATE TABLE "write_offs" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "date" TEXT,
    "loanId" TEXT,
    "paymentScheduleId" TEXT,
    "principalAmountWrittenOff" DOUBLE PRECISION,
    "interestAmountWrittenOff" DOUBLE PRECISION,
    "vehicleInsuranceAmountWrittenOff" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "createdAtSheet" TEXT,
    "createdBy" TEXT,
    "region" TEXT,
    "sslId" TEXT,
    "loanOrPaymentLevel" TEXT,
    "penaltyAmountWrittenOff" DOUBLE PRECISION,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "write_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'initial',
    "data" JSONB NOT NULL DEFAULT '{}',
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "write_offs_sheetId_key" ON "write_offs"("sheetId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversations_phoneNumber_key" ON "whatsapp_conversations"("phoneNumber");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_phoneNumber_idx" ON "whatsapp_conversations"("phoneNumber");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_state_idx" ON "whatsapp_conversations"("state");
