-- CreateTable
CREATE TABLE "SspSchedule" (
    "id" SERIAL NOT NULL,
    "sspId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SspSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SspAppointment" (
    "id" SERIAL NOT NULL,
    "farmerId" INTEGER NOT NULL,
    "sspId" INTEGER NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SspAppointment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SspSchedule" ADD CONSTRAINT "SspSchedule_sspId_fkey" FOREIGN KEY ("sspId") REFERENCES "SspUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SspAppointment" ADD CONSTRAINT "SspAppointment_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SspAppointment" ADD CONSTRAINT "SspAppointment_sspId_fkey" FOREIGN KEY ("sspId") REFERENCES "SspUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SspAppointment" ADD CONSTRAINT "SspAppointment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "SspSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
