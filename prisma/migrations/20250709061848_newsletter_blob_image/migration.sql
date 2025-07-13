/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Newsletter` table. All the data in the column will be lost.
  - Added the required column `imageBlob` to the `Newsletter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageMimeType` to the `Newsletter` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Newsletter" DROP COLUMN "imageUrl",
ADD COLUMN     "imageBlob" BYTEA NOT NULL,
ADD COLUMN     "imageMimeType" TEXT NOT NULL;
