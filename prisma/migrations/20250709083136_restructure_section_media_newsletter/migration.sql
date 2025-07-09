/*
  Warnings:

  - You are about to drop the `SectionMedia` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SectionMedia" DROP CONSTRAINT "SectionMedia_sectionId_fkey";

-- DropTable
DROP TABLE "SectionMedia";

-- CreateTable
CREATE TABLE "CaseStudySectionMedia" (
    "id" TEXT NOT NULL,
    "caseStudySectionId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "blob" BYTEA NOT NULL,

    CONSTRAINT "CaseStudySectionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseStudySectionMedia_caseStudySectionId_idx" ON "CaseStudySectionMedia"("caseStudySectionId");

-- CreateIndex
CREATE INDEX "CaseStudySection_caseStudyId_idx" ON "CaseStudySection"("caseStudyId");

-- CreateIndex
CREATE INDEX "Newsletter_date_idx" ON "Newsletter"("date");

-- CreateIndex
CREATE INDEX "NewsletterSection_newsletterId_idx" ON "NewsletterSection"("newsletterId");

-- AddForeignKey
ALTER TABLE "CaseStudySectionMedia" ADD CONSTRAINT "CaseStudySectionMedia_caseStudySectionId_fkey" FOREIGN KEY ("caseStudySectionId") REFERENCES "CaseStudySection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
