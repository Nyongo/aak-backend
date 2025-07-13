-- AlterTable
ALTER TABLE "daily_work_plan" ADD COLUMN     "locationIsVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingOfficerComments" TEXT,
ADD COLUMN     "pinnedLocation" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "schoolName" TEXT,
ADD COLUMN     "taskOfTheDay" TEXT,
ADD COLUMN     "teamLeaderId" TEXT;
