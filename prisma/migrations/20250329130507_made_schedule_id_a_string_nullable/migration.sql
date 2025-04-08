-- DropForeignKey
ALTER TABLE "SspBidding" DROP CONSTRAINT "SspBidding_scheduleId_fkey";

-- AlterTable
ALTER TABLE "SspBidding" ALTER COLUMN "scheduleId" SET DATA TYPE TEXT;
