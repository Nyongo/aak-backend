-- CreateTable
CREATE TABLE "Payroll" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "role" TEXT,
    "numberOfEmployeesInRole" INTEGER,
    "monthlySalary" DOUBLE PRECISION,
    "monthsPerYearTheRoleIsPaid" INTEGER,
    "notes" TEXT,
    "totalAnnualCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_sheetId_key" ON "Payroll"("sheetId");
