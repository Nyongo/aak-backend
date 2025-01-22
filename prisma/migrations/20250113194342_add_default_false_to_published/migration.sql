/*
  Warnings:

  - You are about to drop the column `email` on the `Pesticide` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Pesticide_email_key";

-- AlterTable
ALTER TABLE "Pesticide" DROP COLUMN "email";
