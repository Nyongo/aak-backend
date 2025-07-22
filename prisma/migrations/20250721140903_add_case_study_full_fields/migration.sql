/*
  Warnings:

  - Added the required column `description` to the `CaseStudy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `CaseStudy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stats` to the `CaseStudy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `CaseStudy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CaseStudy" ADD COLUMN     "bannerBlob" BYTEA,
ADD COLUMN     "bannerMime" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "order" INTEGER NOT NULL,
ADD COLUMN     "stats" JSONB NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
