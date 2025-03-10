-- CreateTable
CREATE TABLE "ServiceRequestCrops" (
    "id" SERIAL NOT NULL,
    "cropId" INTEGER NOT NULL,
    "serviceRequestId" INTEGER NOT NULL,

    CONSTRAINT "ServiceRequestCrops_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServiceRequestCrops" ADD CONSTRAINT "ServiceRequestCrops_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestCrops" ADD CONSTRAINT "ServiceRequestCrops_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
