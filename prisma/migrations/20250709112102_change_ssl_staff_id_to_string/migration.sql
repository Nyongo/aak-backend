/*
  Warnings:

  - The primary key for the `ssl_staff` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "ssl_staff" DROP CONSTRAINT "ssl_staff_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ssl_staff_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ssl_staff_id_seq";

-- CreateTable
CREATE TABLE "daily_work_plan" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "plannedVisit" TEXT NOT NULL,
    "actualGpsCoordinates" TEXT,
    "callsMadeDescription" TEXT NOT NULL,
    "notes" TEXT,
    "supervisorReview" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "sslStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "lastUpdatedById" INTEGER,

    CONSTRAINT "daily_work_plan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "daily_work_plan" ADD CONSTRAINT "daily_work_plan_sslStaffId_fkey" FOREIGN KEY ("sslStaffId") REFERENCES "ssl_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_work_plan" ADD CONSTRAINT "daily_work_plan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_work_plan" ADD CONSTRAINT "daily_work_plan_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
