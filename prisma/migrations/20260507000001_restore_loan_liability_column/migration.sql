-- Restore the dropped column. The 70-char field name exceeds PostgreSQL's 63-char identifier
-- limit, so we use the actual truncated name (63 chars) that PostgreSQL stores on disk.
-- The Prisma schema field is mapped to this name via @map.
ALTER TABLE "Loan"
  ADD COLUMN IF NOT EXISTS "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn" TEXT;
