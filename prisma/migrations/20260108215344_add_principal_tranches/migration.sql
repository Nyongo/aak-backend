/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- CreateTable
CREATE TABLE "principal_tranches" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "loanId" TEXT,
    "borrowerId" TEXT,
    "creditApplicationId" TEXT,
    "trancheNumber" TEXT,
    "trancheSequence" TEXT,
    "principalAmount" TEXT,
    "originalPrincipalAmount" TEXT,
    "remainingPrincipalBalance" TEXT,
    "principalAmountPaid" TEXT,
    "dueDate" TEXT,
    "paymentDate" TEXT,
    "paymentStatus" TEXT,
    "paymentMethod" TEXT,
    "amountPaid" TEXT,
    "amountDue" TEXT,
    "balanceCarriedForward" TEXT,
    "daysLate" TEXT,
    "paymentOverdue" TEXT,
    "par14" TEXT,
    "par30" TEXT,
    "par60" TEXT,
    "par90" TEXT,
    "par120" TEXT,
    "isPaid" TEXT,
    "isOverdue" TEXT,
    "notes" TEXT,
    "remarks" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "principal_tranches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "principal_tranches_sheetId_key" ON "principal_tranches"("sheetId");
