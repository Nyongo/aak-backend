/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DirectPaymentSchedule" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "dateForMpesaBankTransfer" TEXT,
ADD COLUMN     "dateToBankCheck" TEXT,
ADD COLUMN     "interestSuspended" TEXT,
ADD COLUMN     "loanCategory" TEXT,
ADD COLUMN     "par120" TEXT,
ADD COLUMN     "par60" TEXT,
ADD COLUMN     "par90" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "sslId" TEXT,
ADD COLUMN     "vehicleInsuranceFeesUtilized" TEXT,
ADD COLUMN     "writeOffDate" TEXT;

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;
