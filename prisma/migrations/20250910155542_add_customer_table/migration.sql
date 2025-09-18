/*
  Warnings:

  - The values [READ,UNREAD] on the enum `MessageStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [PARTNER,NORMAL,ENQUIRY] on the enum `MessageType` will be removed. If these variants are still used in the database, this will fail.
  - The values [JF_NETWORK,JF_FOUNDATION,JF_FINANCE,JF_HUB] on the enum `Platform` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `ContactMessage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');

-- Normalize existing ContactMessage enum values before altering enums
-- MessageStatus: map deprecated values to new ones
UPDATE "ContactMessage" SET "status" = 'NEW' WHERE "status" IN ('UNREAD');
UPDATE "ContactMessage" SET "status" = 'RESOLVED' WHERE "status" IN ('READ');

-- MessageType: map deprecated values to the new enum variants
UPDATE "ContactMessage" SET "messageType" = 'GENERAL_INQUIRY' WHERE "messageType" IN ('NORMAL', 'ENQUIRY');
UPDATE "ContactMessage" SET "messageType" = 'PARTNERSHIP_INQUIRY' WHERE "messageType" = 'PARTNER';

-- Platform: map deprecated values to the new enum variants
UPDATE "ContactMessage" SET "platform" = 'WEBSITE' WHERE "platform" IN ('JF_NETWORK', 'JF_FOUNDATION', 'JF_FINANCE', 'JF_HUB');

-- AlterEnum
BEGIN;
CREATE TYPE "MessageStatus_new" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
ALTER TABLE "ContactMessage" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ContactMessage" ALTER COLUMN "status" TYPE "MessageStatus_new" USING ("status"::text::"MessageStatus_new");
ALTER TYPE "MessageStatus" RENAME TO "MessageStatus_old";
ALTER TYPE "MessageStatus_new" RENAME TO "MessageStatus";
DROP TYPE "MessageStatus_old";
ALTER TABLE "ContactMessage" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MessageType_new" AS ENUM ('GENERAL_INQUIRY', 'SUPPORT_REQUEST', 'PARTNERSHIP_INQUIRY', 'FEEDBACK', 'OTHER');
ALTER TABLE "ContactMessage" ALTER COLUMN "messageType" TYPE "MessageType_new" USING ("messageType"::text::"MessageType_new");
ALTER TYPE "MessageType" RENAME TO "MessageType_old";
ALTER TYPE "MessageType_new" RENAME TO "MessageType";
DROP TYPE "MessageType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Platform_new" AS ENUM ('WEBSITE', 'MOBILE_APP', 'API', 'EMAIL', 'PHONE');
ALTER TABLE "ContactMessage" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TYPE "Platform" RENAME TO "Platform_old";
ALTER TYPE "Platform_new" RENAME TO "Platform";
DROP TYPE "Platform_old";
COMMIT;

-- Add updatedAt with a default to satisfy NOT NULL on existing rows
ALTER TABLE "ContactMessage" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "companyLogo" TEXT,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "numberOfSchools" INTEGER NOT NULL DEFAULT 0,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_emailAddress_key" ON "Customer"("emailAddress");
