-- CreateTable
CREATE TABLE "CallList" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "isDeleted" BOOLEAN DEFAULT false,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" INTEGER,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CallList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallListItem" (
    "id" SERIAL NOT NULL,
    "callListId" INTEGER,
    "userId" INTEGER,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "gender" TEXT,
    "description" TEXT,
    "status" TEXT,
    "recordingUrl" TEXT,
    "callResultsNarration" TEXT,
    "callMadeOn" TIMESTAMP(3),
    "callScheduledOn" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "rescheduledOn" TIMESTAMP(3),
    "rescheduleCount" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "isDeleted" BOOLEAN DEFAULT false,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" INTEGER,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CallListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallListItemEvents" (
    "id" SERIAL NOT NULL,
    "callListItemId" INTEGER,
    "userId" INTEGER,
    "status" TEXT,
    "narration" TEXT,
    "rescheduledTo" TEXT,
    "callStartTime" TEXT,
    "callEndTime" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "isDeleted" BOOLEAN DEFAULT false,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" INTEGER,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CallListItemEvents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallRecording" (
    "id" SERIAL NOT NULL,
    "contactId" INTEGER,
    "recording" TEXT,
    "description" TEXT,
    "status" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "isDeleted" BOOLEAN DEFAULT false,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" INTEGER,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "CallRecording_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CallList" ADD CONSTRAINT "CallList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallListItem" ADD CONSTRAINT "CallListItem_callListId_fkey" FOREIGN KEY ("callListId") REFERENCES "CallList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallListItem" ADD CONSTRAINT "CallListItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallListItemEvents" ADD CONSTRAINT "CallListItemEvents_callListItemId_fkey" FOREIGN KEY ("callListItemId") REFERENCES "CallListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallListItemEvents" ADD CONSTRAINT "CallListItemEvents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRecording" ADD CONSTRAINT "CallRecording_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CallListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
