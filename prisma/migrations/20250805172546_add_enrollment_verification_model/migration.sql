-- CreateTable
CREATE TABLE "EnrollmentVerification" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "subCountyEnrollmentReport" TEXT,
    "enrollmentReport" TEXT,
    "numberOfStudentsThisYear" INTEGER,
    "numberOfStudentsLastYear" INTEGER,
    "numberOfStudentsTwoYearsAgo" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EnrollmentVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentVerification_sheetId_key" ON "EnrollmentVerification"("sheetId");
