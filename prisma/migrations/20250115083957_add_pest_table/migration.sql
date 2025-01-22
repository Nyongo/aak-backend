-- CreateTable
CREATE TABLE "Pest" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "kingdom" TEXT NOT NULL,
    "phylum" TEXT,
    "genus" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "lastUpdatedById" INTEGER,

    CONSTRAINT "Pest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pest_name_key" ON "Pest"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Pest_scientificName_key" ON "Pest"("scientificName");
