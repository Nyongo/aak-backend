/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `authors` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `authors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Loan"
  ADD COLUMN IF NOT EXISTS "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;
ALTER TABLE "Loan" DROP COLUMN IF EXISTS "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn";

-- AlterTable
ALTER TABLE "authors" DROP COLUMN "bio",
DROP COLUMN "role",
ADD COLUMN     "education" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "expertise" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "yearsAtJF" INTEGER;

-- CreateTable
CREATE TABLE "author_translations" (
    "id" TEXT NOT NULL,
    "language" "BlogLanguage" NOT NULL,
    "role" TEXT,
    "bio" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "author_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "author_translations_authorId_language_key" ON "author_translations"("authorId", "language");

-- AddForeignKey
ALTER TABLE "author_translations" ADD CONSTRAINT "author_translations_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
