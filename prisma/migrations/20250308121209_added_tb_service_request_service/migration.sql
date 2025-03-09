-- CreateTable
CREATE TABLE "ServiceRequestService" (
    "id" SERIAL NOT NULL,
    "serviceTypeId" INTEGER NOT NULL,
    "serviceRequestId" INTEGER NOT NULL,

    CONSTRAINT "ServiceRequestService_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServiceRequestService" ADD CONSTRAINT "ServiceRequestService_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestService" ADD CONSTRAINT "ServiceRequestService_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
