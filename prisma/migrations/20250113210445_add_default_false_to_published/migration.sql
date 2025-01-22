-- DropForeignKey
ALTER TABLE "Pesticide" DROP CONSTRAINT "Pesticide_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Pesticide" DROP CONSTRAINT "Pesticide_lastUpdatedById_fkey";

-- AlterTable
ALTER TABLE "Pesticide" ALTER COLUMN "lastUpdatedAt" DROP NOT NULL,
ALTER COLUMN "createdById" DROP NOT NULL,
ALTER COLUMN "lastUpdatedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Pesticide" ADD CONSTRAINT "Pesticide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pesticide" ADD CONSTRAINT "Pesticide_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
