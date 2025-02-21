-- AlterTable
ALTER TABLE "FarmerFarm" ADD COLUMN     "altitude" TEXT,
ADD COLUMN     "humidity" TEXT,
ADD COLUMN     "soilTemp" TEXT,
ADD COLUMN     "soilType" TEXT;

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "priority" TEXT,
ADD COLUMN     "sspRating" INTEGER;
