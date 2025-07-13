-- DropForeignKey
ALTER TABLE "daily_work_plan" DROP CONSTRAINT "daily_work_plan_createdById_fkey";

-- DropForeignKey
ALTER TABLE "daily_work_plan" DROP CONSTRAINT "daily_work_plan_lastUpdatedById_fkey";

-- DropForeignKey
ALTER TABLE "ssl_staff" DROP CONSTRAINT "ssl_staff_createdById_fkey";

-- DropForeignKey
ALTER TABLE "ssl_staff" DROP CONSTRAINT "ssl_staff_lastUpdatedById_fkey";
