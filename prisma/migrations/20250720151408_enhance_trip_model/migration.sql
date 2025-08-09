/*
  Warnings:

  - The `status` column on the `Trip` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `pricePerKm` to the `Trip` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'REFUNDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "distance" DOUBLE PRECISION,
ADD COLUMN     "endGeopoints" TEXT,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "fuelConsumption" DOUBLE PRECISION,
ADD COLUMN     "fuelCost" DOUBLE PRECISION,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "pricePerKm" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "startGeopoints" TEXT,
ADD COLUMN     "totalPrice" DOUBLE PRECISION,
DROP COLUMN "status",
ADD COLUMN     "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED';
