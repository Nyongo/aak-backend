-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoggedInOn" TIMESTAMP(3),
ADD COLUMN     "requirePasswordReset" BOOLEAN NOT NULL DEFAULT false;
