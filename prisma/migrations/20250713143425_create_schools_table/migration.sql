-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "postalAddress" TEXT,
    "county" TEXT,
    "region" TEXT,
    "schoolType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "principalName" TEXT,
    "principalPhone" TEXT,
    "principalEmail" TEXT,
    "totalStudents" INTEGER,
    "totalTeachers" INTEGER,
    "registrationNumber" TEXT,
    "establishmentDate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "lastUpdatedById" INTEGER,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_schoolId_key" ON "schools"("schoolId");
