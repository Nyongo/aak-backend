-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "sspScheduleId" INTEGER;

-- AlterTable
ALTER TABLE "SspBidding" ADD COLUMN     "requestedByFarmer" BOOLEAN NOT NULL DEFAULT false;
