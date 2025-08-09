/*
  Warnings:

  - A unique constraint covering the columns `[nationalId]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gender` to the `Driver` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nationalId` to the `Driver` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "driverLicensePhoto" TEXT,
ADD COLUMN     "gender" TEXT NOT NULL,
ADD COLUMN     "idPhoto" TEXT,
ADD COLUMN     "nationalId" TEXT NOT NULL,
ADD COLUMN     "passportPhoto" TEXT,
ADD COLUMN     "psvLicenseDoc" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Driver_nationalId_key" ON "Driver"("nationalId");
