/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.

  Idempotent variants: safe when enums/tables already exist (e.g. after a partial run or `db push`).
*/
-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "BlogLanguage" AS ENUM ('EN', 'KIS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BlogSectionType" AS ENUM ('TEXT', 'AD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN IF EXISTS "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn";
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "blog_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "heroImage" TEXT,
    "heroImagePublicId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "publishedAt" TIMESTAMP(3),
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "blog_post_translations" (
    "id" TEXT NOT NULL,
    "language" "BlogLanguage" NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_post_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "blog_hero_sections" (
    "id" TEXT NOT NULL,
    "heroImage" TEXT,
    "heroImagePublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_hero_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "blog_hero_section_translations" (
    "id" TEXT NOT NULL,
    "language" "BlogLanguage" NOT NULL,
    "heading" TEXT,
    "subheading" TEXT,
    "heroSectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_hero_section_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_slug_key" ON "blog_categories"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "blog_post_translations_postId_language_key" ON "blog_post_translations"("postId", "language");
CREATE UNIQUE INDEX IF NOT EXISTS "blog_hero_section_translations_heroSectionId_language_key" ON "blog_hero_section_translations"("heroSectionId", "language");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "blog_post_translations" ADD CONSTRAINT "blog_post_translations_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "blog_hero_section_translations" ADD CONSTRAINT "blog_hero_section_translations_heroSectionId_fkey" FOREIGN KEY ("heroSectionId") REFERENCES "blog_hero_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
