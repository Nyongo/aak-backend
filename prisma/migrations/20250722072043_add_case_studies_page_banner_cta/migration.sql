-- CreateTable
CREATE TABLE "CaseStudiesPageBanner" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "eyebrow" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "CaseStudiesPageBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudiesPageCta" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "buttonLink" TEXT NOT NULL,

    CONSTRAINT "CaseStudiesPageCta_pkey" PRIMARY KEY ("id")
);
