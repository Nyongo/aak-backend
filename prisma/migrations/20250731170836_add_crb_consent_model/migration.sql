-- CreateTable
CREATE TABLE "CrbConsent" (
    "id" SERIAL NOT NULL,
    "sheetId" TEXT,
    "borrowerId" TEXT,
    "agreement" TEXT,
    "signedByName" TEXT,
    "date" TEXT,
    "roleInOrganization" TEXT,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CrbConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrbConsent_sheetId_key" ON "CrbConsent"("sheetId");
