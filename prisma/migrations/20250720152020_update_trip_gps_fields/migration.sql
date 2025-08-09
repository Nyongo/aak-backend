/*
  Warnings:

  - You are about to drop the column `endGeopoints` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `endLocation` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `startGeopoints` on the `Trip` table. All the data in the column will be lost.
  - You are about to drop the column `startLocation` on the `Trip` table. All the data in the column will be lost.
  - Added the required column `startGps` to the `Trip` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "endGeopoints",
DROP COLUMN "endLocation",
DROP COLUMN "startGeopoints",
DROP COLUMN "startLocation",
ADD COLUMN     "endGps" TEXT,
ADD COLUMN     "startGps" TEXT NOT NULL;
