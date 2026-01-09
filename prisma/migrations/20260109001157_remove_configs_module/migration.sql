/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.
  - You are about to drop the `County` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Crop` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Pest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Pesticide` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceType` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- DropTable
DROP TABLE "County";

-- DropTable
DROP TABLE "Crop";

-- DropTable
DROP TABLE "Pest";

-- DropTable
DROP TABLE "Pesticide";

-- DropTable
DROP TABLE "ServiceType";
