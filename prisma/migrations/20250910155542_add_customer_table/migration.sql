/*
  Fixed migration.sql for fresh DBs (no IF NOT EXISTS usage in CREATE statements).
  - safe sequence for enum changes: TEXT -> normalize -> enum -> rename
  - drop defaults before casting enums
*/

-- Create CustomerStatus
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');

-- ------------------------
-- MessageStatus migration (safe sequence)
-- ------------------------
BEGIN;

-- 1) create the replacement type with final values
CREATE TYPE "MessageStatus_new" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- 2) convert existing column to TEXT so we can update freely
ALTER TABLE "ContactMessage" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);

-- 3) normalize existing textual values (map old tokens to new ones)
UPDATE "ContactMessage" SET "status" = 'NEW' WHERE "status" IN ('UNREAD');
UPDATE "ContactMessage" SET "status" = 'RESOLVED' WHERE "status" IN ('READ');

-- 4) DROP the default so Postgres won't attempt to cast the old default during the TYPE change
ALTER TABLE "ContactMessage" ALTER COLUMN "status" DROP DEFAULT;

-- 5) convert text back to the new enum
ALTER TABLE "ContactMessage" ALTER COLUMN "status" TYPE "MessageStatus_new" USING ("status"::text::"MessageStatus_new");

-- 6) swap names so public name stays "MessageStatus"
ALTER TYPE "MessageStatus" RENAME TO "MessageStatus_old";
ALTER TYPE "MessageStatus_new" RENAME TO "MessageStatus";
DROP TYPE "MessageStatus_old";

-- 7) restore sensible default
ALTER TABLE "ContactMessage" ALTER COLUMN "status" SET DEFAULT 'NEW';

COMMIT;

-- ------------------------
-- MessageType migration (safe sequence)
-- ------------------------
BEGIN;

CREATE TYPE "MessageType_new" AS ENUM ('GENERAL_INQUIRY', 'SUPPORT_REQUEST', 'PARTNERSHIP_INQUIRY', 'FEEDBACK', 'OTHER');

ALTER TABLE "ContactMessage" ALTER COLUMN "messageType" TYPE TEXT USING ("messageType"::text);

-- normalize deprecated values to new labels
UPDATE "ContactMessage" SET "messageType" = 'GENERAL_INQUIRY' WHERE "messageType" IN ('NORMAL', 'ENQUIRY');
UPDATE "ContactMessage" SET "messageType" = 'PARTNERSHIP_INQUIRY' WHERE "messageType" = 'PARTNER';

-- drop default to avoid cast problems
ALTER TABLE "ContactMessage" ALTER COLUMN "messageType" DROP DEFAULT;

ALTER TABLE "ContactMessage" ALTER COLUMN "messageType" TYPE "MessageType_new" USING ("messageType"::text::"MessageType_new");
ALTER TYPE "MessageType" RENAME TO "MessageType_old";
ALTER TYPE "MessageType_new" RENAME TO "MessageType";
DROP TYPE "MessageType_old";

COMMIT;

-- ------------------------
-- Platform migration (safe sequence)
-- ------------------------
BEGIN;

CREATE TYPE "Platform_new" AS ENUM ('WEBSITE', 'MOBILE_APP', 'API', 'EMAIL', 'PHONE');

ALTER TABLE "ContactMessage" ALTER COLUMN "platform" TYPE TEXT USING ("platform"::text);

-- normalize deprecated platform labels
UPDATE "ContactMessage" SET "platform" = 'WEBSITE' WHERE "platform" IN ('JF_NETWORK', 'JF_FOUNDATION', 'JF_FINANCE', 'JF_HUB');

-- drop default to avoid cast problems
ALTER TABLE "ContactMessage" ALTER COLUMN "platform" DROP DEFAULT;

ALTER TABLE "ContactMessage" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TYPE "Platform" RENAME TO "Platform_old";
ALTER TYPE "Platform_new" RENAME TO "Platform";
DROP TYPE "Platform_old";

COMMIT;

-- ------------------------
-- Add updatedAt with a default to satisfy NOT NULL on existing rows
-- ------------------------
ALTER TABLE "ContactMessage"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- re-affirm status default (already set above but safe)
ALTER TABLE "ContactMessage" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- ------------------------
-- AlterTable: Loan column rename/drop
-- ------------------------
ALTER TABLE "Loan"
  DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
  ADD COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- ------------------------
-- CreateTable: Customer
-- ------------------------
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

-- Create unique index
CREATE UNIQUE INDEX "Customer_emailAddress_key" ON "Customer"("emailAddress");
