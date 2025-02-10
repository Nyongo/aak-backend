-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "farmerId" INTEGER,
    "farmId" INTEGER NOT NULL,
    "assignedSspId" INTEGER,
    "requestStatus" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateStarted" TIMESTAMP(3),
    "dateCompleted" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "lastUpdatedById" INTEGER,
    "serviceCosts" INTEGER,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "FarmerFarm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_assignedSspId_fkey" FOREIGN KEY ("assignedSspId") REFERENCES "SspUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
