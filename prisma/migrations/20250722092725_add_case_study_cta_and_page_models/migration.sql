/*
  Warnings:

  - The primary key for the `CaseStudiesPageBanner` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `CaseStudiesPageBanner` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `CaseStudiesPageCta` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `CaseStudiesPageCta` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `cta` on the `CaseStudy` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CaseStudiesPageBanner" DROP CONSTRAINT "CaseStudiesPageBanner_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" INTEGER NOT NULL DEFAULT 1,
ADD CONSTRAINT "CaseStudiesPageBanner_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "CaseStudiesPageCta" DROP CONSTRAINT "CaseStudiesPageCta_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" INTEGER NOT NULL DEFAULT 1,
ADD CONSTRAINT "CaseStudiesPageCta_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "CaseStudy" DROP COLUMN "cta";

-- CreateTable
CREATE TABLE "CaseStudyCta" (
    "caseStudyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "buttonRoute" TEXT NOT NULL,

    CONSTRAINT "CaseStudyCta_pkey" PRIMARY KEY ("caseStudyId")
);

-- AddForeignKey
ALTER TABLE "CaseStudyCta" ADD CONSTRAINT "CaseStudyCta_caseStudyId_fkey" FOREIGN KEY ("caseStudyId") REFERENCES "CaseStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
