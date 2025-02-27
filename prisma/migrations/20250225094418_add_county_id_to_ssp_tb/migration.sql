-- AlterTable
ALTER TABLE "SspUser" ADD COLUMN     "countyId" INTEGER;

-- AddForeignKey
ALTER TABLE "SspUser" ADD CONSTRAINT "SspUser_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE CASCADE ON UPDATE CASCADE;
