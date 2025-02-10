-- CreateTable
CREATE TABLE "SspUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "userId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,
    "lastUpdatedById" INTEGER,

    CONSTRAINT "SspUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SspUser_email_key" ON "SspUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SspUser_phoneNumber_key" ON "SspUser"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SspUser_userId_key" ON "SspUser"("userId");

-- AddForeignKey
ALTER TABLE "SspUser" ADD CONSTRAINT "SspUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
