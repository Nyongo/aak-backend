-- CreateTable
CREATE TABLE "OtherSupportingDoc" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "creditApplicationId" TEXT,
    "documentType" TEXT,
    "notes" TEXT,
    "file" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OtherSupportingDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OtherSupportingDoc_sheetId_key" ON "OtherSupportingDoc"("sheetId");
