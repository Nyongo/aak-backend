-- CreateTable
CREATE TABLE "FeePlan" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "schoolYear" TEXT,
    "photo" TEXT,
    "file" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FeePlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeePlan_sheetId_key" ON "FeePlan"("sheetId");
