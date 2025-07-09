/*
  Warnings:

  - You are about to drop the `CaseStudySectionMedia` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CaseStudySectionMedia" DROP CONSTRAINT "CaseStudySectionMedia_caseStudySectionId_fkey";

-- DropTable
DROP TABLE "CaseStudySectionMedia";

-- CreateTable
CREATE TABLE "SectionMedia" (
    "id" TEXT NOT NULL,
    "caseStudySectionId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "blob" BYTEA NOT NULL,

    CONSTRAINT "SectionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectionMedia_caseStudySectionId_idx" ON "SectionMedia"("caseStudySectionId");

-- AddForeignKey
ALTER TABLE "SectionMedia" ADD CONSTRAINT "SectionMedia_caseStudySectionId_fkey" FOREIGN KEY ("caseStudySectionId") REFERENCES "CaseStudySection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
