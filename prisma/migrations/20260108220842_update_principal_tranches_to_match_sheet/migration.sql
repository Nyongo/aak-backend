/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.
  - You are about to drop the column `amountDue` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `amountPaid` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `balanceCarriedForward` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `borrowerId` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `creditApplicationId` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `daysLate` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `isOverdue` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `isPaid` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `loanId` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `originalPrincipalAmount` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `par120` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `par14` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `par30` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `par60` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `par90` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `paymentDate` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `paymentOverdue` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `principalAmount` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `principalAmountPaid` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `remainingPrincipalBalance` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `trancheNumber` on the `principal_tranches` table. All the data in the column will be lost.
  - You are about to drop the column `trancheSequence` on the `principal_tranches` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- AlterTable
ALTER TABLE "principal_tranches" DROP COLUMN "amountDue",
DROP COLUMN "amountPaid",
DROP COLUMN "balanceCarriedForward",
DROP COLUMN "borrowerId",
DROP COLUMN "creditApplicationId",
DROP COLUMN "daysLate",
DROP COLUMN "dueDate",
DROP COLUMN "isOverdue",
DROP COLUMN "isPaid",
DROP COLUMN "loanId",
DROP COLUMN "notes",
DROP COLUMN "originalPrincipalAmount",
DROP COLUMN "par120",
DROP COLUMN "par14",
DROP COLUMN "par30",
DROP COLUMN "par60",
DROP COLUMN "par90",
DROP COLUMN "paymentDate",
DROP COLUMN "paymentMethod",
DROP COLUMN "paymentOverdue",
DROP COLUMN "paymentStatus",
DROP COLUMN "principalAmount",
DROP COLUMN "principalAmountPaid",
DROP COLUMN "remainingPrincipalBalance",
DROP COLUMN "remarks",
DROP COLUMN "status",
DROP COLUMN "trancheNumber",
DROP COLUMN "trancheSequence",
ADD COLUMN     "amount" TEXT,
ADD COLUMN     "contractSigningDate" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "dateTrancheHasGonePar30" TEXT,
ADD COLUMN     "directLoanId" TEXT,
ADD COLUMN     "hasFemaleDirector" TEXT,
ADD COLUMN     "initialDisbursementDateInContract" TEXT,
ADD COLUMN     "loanType" TEXT,
ADD COLUMN     "reassigned" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "sslId" TEXT,
ADD COLUMN     "teamLeader" TEXT;
