/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AcademyGuideStatus" AS ENUM ('DRAFT', 'COMING_SOON', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AcademyLanguage" AS ENUM ('EN', 'KIS');

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- CreateTable
CREATE TABLE "academy_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_guides" (
    "id" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "youtubeThumbnail" TEXT,
    "duration" TEXT,
    "status" "AcademyGuideStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "scheduledPublishAt" TIMESTAMP(3),
    "notificationSent24h" BOOLEAN NOT NULL DEFAULT false,
    "notificationSent1h" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_guide_tags" (
    "guideId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "academy_guide_tags_pkey" PRIMARY KEY ("guideId","tagId")
);

-- CreateTable
CREATE TABLE "academy_guide_translations" (
    "id" TEXT NOT NULL,
    "language" "AcademyLanguage" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_guide_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_guide_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_guide_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_hero_sections" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_hero_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_hero_translations" (
    "id" TEXT NOT NULL,
    "language" "AcademyLanguage" NOT NULL,
    "subheading" TEXT,
    "heroSectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_hero_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academy_categories_slug_key" ON "academy_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "academy_tags_slug_key" ON "academy_tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "academy_guide_translations_guideId_language_key" ON "academy_guide_translations"("guideId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "academy_guide_subscribers_guideId_email_key" ON "academy_guide_subscribers"("guideId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "academy_hero_translations_heroSectionId_language_key" ON "academy_hero_translations"("heroSectionId", "language");

-- AddForeignKey
ALTER TABLE "academy_guides" ADD CONSTRAINT "academy_guides_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "academy_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_guide_tags" ADD CONSTRAINT "academy_guide_tags_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "academy_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_guide_tags" ADD CONSTRAINT "academy_guide_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "academy_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_guide_translations" ADD CONSTRAINT "academy_guide_translations_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "academy_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_guide_subscribers" ADD CONSTRAINT "academy_guide_subscribers_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "academy_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_hero_translations" ADD CONSTRAINT "academy_hero_translations_heroSectionId_fkey" FOREIGN KEY ("heroSectionId") REFERENCES "academy_hero_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
