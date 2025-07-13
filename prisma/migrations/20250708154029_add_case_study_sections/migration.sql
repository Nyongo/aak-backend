-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('banner', 'content');

-- CreateTable
CREATE TABLE "CaseStudySection" (
    "id" TEXT NOT NULL,
    "caseStudyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "SectionType" NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseStudySection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionMedia" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "blob" BYTEA NOT NULL,

    CONSTRAINT "SectionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectionMedia_sectionId_idx" ON "SectionMedia"("sectionId");

-- AddForeignKey
ALTER TABLE "SectionMedia" ADD CONSTRAINT "SectionMedia_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "CaseStudySection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
