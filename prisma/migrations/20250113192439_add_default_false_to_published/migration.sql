-- CreateTable
CREATE TABLE "Pesticide" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "activeAgent" TEXT NOT NULL,
    "manufacturerOfRegistrant" TEXT NOT NULL,
    "localAgent" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "lastUpdatedById" INTEGER NOT NULL,

    CONSTRAINT "Pesticide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pesticide_email_key" ON "Pesticide"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pesticide_registrationNumber_key" ON "Pesticide"("registrationNumber");

-- AddForeignKey
ALTER TABLE "Pesticide" ADD CONSTRAINT "Pesticide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pesticide" ADD CONSTRAINT "Pesticide_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
