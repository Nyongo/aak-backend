-- Add year to interim_check_ins so Term 1 2026 and Term 1 2027 are distinct records.
-- Existing rows default to the current year at migration time.
ALTER TABLE "interim_check_ins"
  ADD COLUMN "year" INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER;
