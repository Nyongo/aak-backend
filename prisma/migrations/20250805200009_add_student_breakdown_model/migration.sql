-- CreateTable
CREATE TABLE "StudentBreakdown" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "feeType" TEXT,
    "term" TEXT,
    "grade" TEXT,
    "numberOfStudents" INTEGER,
    "fee" DOUBLE PRECISION,
    "totalRevenue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StudentBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentBreakdown_sheetId_key" ON "StudentBreakdown"("sheetId");
