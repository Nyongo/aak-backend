/*
  Warnings:

  - You are about to drop the `SspAppointment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SspAppointment" DROP CONSTRAINT "SspAppointment_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "SspAppointment" DROP CONSTRAINT "SspAppointment_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "SspAppointment" DROP CONSTRAINT "SspAppointment_sspId_fkey";

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "farmersBudget" DOUBLE PRECISION,
ALTER COLUMN "serviceCosts" SET DATA TYPE DOUBLE PRECISION;

-- DropTable
DROP TABLE "SspAppointment";

-- CreateTable
CREATE TABLE "SspBidding" (
    "id" SERIAL NOT NULL,
    "serviceRequestId" INTEGER NOT NULL,
    "sspId" INTEGER NOT NULL,
    "farmerId" INTEGER NOT NULL,
    "scheduleId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SspBidding_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SspBidding" ADD CONSTRAINT "SspBidding_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SspBidding" ADD CONSTRAINT "SspBidding_sspId_fkey" FOREIGN KEY ("sspId") REFERENCES "SspUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SspBidding" ADD CONSTRAINT "SspBidding_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SspBidding" ADD CONSTRAINT "SspBidding_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "SspSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
