-- AlterTable
ALTER TABLE "daily_work_plan" ADD COLUMN     "schoolId" TEXT;

-- AddForeignKey
ALTER TABLE "daily_work_plan" ADD CONSTRAINT "daily_work_plan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
