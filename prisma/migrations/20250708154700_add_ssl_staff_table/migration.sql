-- CreateTable
CREATE TABLE "ssl_staff" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sslId" TEXT NOT NULL,
    "nationalIdNumber" TEXT NOT NULL,
    "nationalIdFront" TEXT,
    "nationalIdBack" TEXT,
    "kraPinNumber" TEXT,
    "kraPinPhoto" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "roleInSchool" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "postalAddress" TEXT,
    "startDate" TEXT NOT NULL,
    "insuredForCreditLife" BOOLEAN NOT NULL DEFAULT false,
    "paymentThisMonth" BOOLEAN NOT NULL DEFAULT false,
    "terminationDate" TEXT,
    "educationLevel" TEXT,
    "sslEmail" TEXT,
    "secondaryRole" TEXT,
    "monthlyTarget" TEXT,
    "creditLifeHelper" TEXT,
    "teamLeader" TEXT,
    "passportPhoto" TEXT,
    "sslLevel" TEXT,
    "sslArea" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "lastUpdatedById" INTEGER,

    CONSTRAINT "ssl_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ssl_staff_borrowerId_key" ON "ssl_staff"("borrowerId");

-- CreateIndex
CREATE UNIQUE INDEX "ssl_staff_email_key" ON "ssl_staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ssl_staff_nationalIdNumber_key" ON "ssl_staff"("nationalIdNumber");

-- AddForeignKey
ALTER TABLE "ssl_staff" ADD CONSTRAINT "ssl_staff_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ssl_staff" ADD CONSTRAINT "ssl_staff_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
