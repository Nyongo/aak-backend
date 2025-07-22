/*
  Warnings:

  - You are about to drop the column `imageBlob` on the `Newsletter` table. All the data in the column will be lost.
  - You are about to drop the column `imageMimeType` on the `Newsletter` table. All the data in the column will be lost.
  - Added the required column `order` to the `Newsletter` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `category` on the `Newsletter` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "Newsletter_date_idx";

-- AlterTable
ALTER TABLE "Newsletter" DROP COLUMN "imageBlob",
DROP COLUMN "imageMimeType",
ADD COLUMN     "bannerBlob" BYTEA,
ADD COLUMN     "bannerMime" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "order" INTEGER NOT NULL,
ALTER COLUMN "date" SET DATA TYPE TEXT,
DROP COLUMN "category",
ADD COLUMN     "category" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "NewsletterSection" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- DropEnum
DROP TYPE "NewsletterCategory";

-- CreateTable
CREATE TABLE "NewsletterPageBanner" (
    "id" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterPageBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterPageCta" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "buttonLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterPageCta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterCta" (
    "newsletterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "buttonLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterCta_pkey" PRIMARY KEY ("newsletterId")
);

-- AddForeignKey
ALTER TABLE "NewsletterCta" ADD CONSTRAINT "NewsletterCta_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
