-- AlterTable
ALTER TABLE "SspUser" ADD COLUMN     "dob" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "occupation" TEXT;

-- CreateTable
CREATE TABLE "FarmerUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "gender" TEXT,
    "occupation" TEXT,
    "dob" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "userId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "lastUpdatedById" INTEGER,

    CONSTRAINT "FarmerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerFarm" (
    "id" SERIAL NOT NULL,
    "plotSize" TEXT,
    "countyId" INTEGER,
    "location" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "imageUrl" TEXT,
    "farmerId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "lastUpdatedById" INTEGER,

    CONSTRAINT "FarmerFarm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crop" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "lastUpdatedById" INTEGER,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropsInFarm" (
    "id" SERIAL NOT NULL,
    "farmId" INTEGER NOT NULL,
    "cropId" INTEGER NOT NULL,
    "description" TEXT,
    "cropStatus" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "lastUpdatedById" INTEGER,

    CONSTRAINT "CropsInFarm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FarmerUser_email_key" ON "FarmerUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerUser_userId_key" ON "FarmerUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Crop_name_key" ON "Crop"("name");

-- AddForeignKey
ALTER TABLE "FarmerUser" ADD CONSTRAINT "FarmerUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerFarm" ADD CONSTRAINT "FarmerFarm_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerFarm" ADD CONSTRAINT "FarmerFarm_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropsInFarm" ADD CONSTRAINT "CropsInFarm_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "FarmerFarm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropsInFarm" ADD CONSTRAINT "CropsInFarm_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
