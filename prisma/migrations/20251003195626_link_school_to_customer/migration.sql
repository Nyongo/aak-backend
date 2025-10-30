/*
  Warnings:

  - The `status` column on the `ContactMessage` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.
  - Changed the type of `messageType` on the `ContactMessage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `platform` on the `ContactMessage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ContactMessage" DROP COLUMN "messageType",
ADD COLUMN     "messageType" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NEW',
DROP COLUMN "platform",
ADD COLUMN     "platform" TEXT NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "customerId" INTEGER,
ADD COLUMN     "latitude" TEXT,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "longitude" TEXT,
ADD COLUMN     "url" TEXT;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
