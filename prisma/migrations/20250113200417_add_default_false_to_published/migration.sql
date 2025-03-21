/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Pesticide` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Pesticide` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Pesticide" ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Pesticide_name_key" ON "Pesticide"("name");
