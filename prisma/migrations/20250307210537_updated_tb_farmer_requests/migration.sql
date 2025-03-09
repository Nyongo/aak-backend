/*
  Warnings:

  - You are about to drop the column `priority` on the `ServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the `CallList` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CallListItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CallListItemEvents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CallRecording` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[serviceRequestId]` on the table `SspSchedule` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "CallList" DROP CONSTRAINT "CallList_userId_fkey";

-- DropForeignKey
ALTER TABLE "CallListItem" DROP CONSTRAINT "CallListItem_callListId_fkey";

-- DropForeignKey
ALTER TABLE "CallListItem" DROP CONSTRAINT "CallListItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "CallListItemEvents" DROP CONSTRAINT "CallListItemEvents_callListItemId_fkey";

-- DropForeignKey
ALTER TABLE "CallListItemEvents" DROP CONSTRAINT "CallListItemEvents_userId_fkey";

-- DropForeignKey
ALTER TABLE "CallRecording" DROP CONSTRAINT "CallRecording_contactId_fkey";

-- AlterTable
ALTER TABLE "ServiceRequest" DROP COLUMN "priority",
ADD COLUMN     "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requestDate" TIMESTAMP(3),
ADD COLUMN     "requestedServicesIds" TEXT,
ADD COLUMN     "urgency" TEXT;

-- AlterTable
ALTER TABLE "SspSchedule" ADD COLUMN     "serviceRequestId" INTEGER;

-- DropTable
DROP TABLE "CallList";

-- DropTable
DROP TABLE "CallListItem";

-- DropTable
DROP TABLE "CallListItemEvents";

-- DropTable
DROP TABLE "CallRecording";

-- CreateIndex
CREATE UNIQUE INDEX "SspSchedule_serviceRequestId_key" ON "SspSchedule"("serviceRequestId");

-- AddForeignKey
ALTER TABLE "SspSchedule" ADD CONSTRAINT "SspSchedule_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
