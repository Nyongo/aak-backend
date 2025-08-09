-- CreateTable
CREATE TABLE "Director" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "borrowerId" TEXT,
    "name" TEXT,
    "nationalIdNumber" TEXT,
    "kraPinNumber" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "gender" TEXT,
    "roleInSchool" TEXT,
    "status" TEXT,
    "dateOfBirth" TEXT,
    "educationLevel" TEXT,
    "insuredForCreditLife" TEXT,
    "address" TEXT,
    "postalAddress" TEXT,
    "nationalIdFront" TEXT,
    "nationalIdBack" TEXT,
    "kraPinPhoto" TEXT,
    "passportPhoto" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Director_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Director_sheetId_key" ON "Director"("sheetId");
