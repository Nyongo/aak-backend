-- CreateTable
CREATE TABLE "NewsletterSection" (
    "id" TEXT NOT NULL,
    "newsletterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "SectionType" NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSectionMedia" (
    "id" TEXT NOT NULL,
    "newsletterSectionId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "blob" BYTEA NOT NULL,

    CONSTRAINT "NewsletterSectionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsletterSectionMedia_newsletterSectionId_idx" ON "NewsletterSectionMedia"("newsletterSectionId");

-- AddForeignKey
ALTER TABLE "NewsletterSection" ADD CONSTRAINT "NewsletterSection_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSectionMedia" ADD CONSTRAINT "NewsletterSectionMedia_newsletterSectionId_fkey" FOREIGN KEY ("newsletterSectionId") REFERENCES "NewsletterSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
