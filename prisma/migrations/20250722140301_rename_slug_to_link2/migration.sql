/*
  Warnings:

  - You are about to drop the column `slug` on the `CaseStudy` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[link]` on the table `CaseStudy` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `link` to the `CaseStudy` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CaseStudy_slug_key";

-- AlterTable
ALTER TABLE "CaseStudy" DROP COLUMN "slug",
ADD COLUMN     "link" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudy_link_key" ON "CaseStudy"("link");
