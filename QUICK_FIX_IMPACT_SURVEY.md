# Quick Fix for Impact Survey Migration on Remote Server

## Problem
The migration file on the remote server still has the old table name `"ImpactSurvey"` instead of `"impact_survey"`.

## Quick Fix (Run on Remote Server)

### Option 1: Use the Fix Script

Copy the `fix-impact-survey-remote.sh` script to your remote server and run:

```bash
chmod +x fix-impact-survey-remote.sh
./fix-impact-survey-remote.sh
```

### Option 2: Manual Commands

Run these commands directly on your remote server:

```bash
# Step 1: Mark as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112192307_update_impact_survey_fields_to_numeric

# Step 2: Manually apply the corrected SQL
docker compose exec postgres psql -U postgres -d nest -f - << 'SQL'
-- Add temp columns
ALTER TABLE "impact_survey" 
ADD COLUMN IF NOT EXISTS "howManyFemaleChildrenAttendTheSchool_temp" INTEGER,
ADD COLUMN IF NOT EXISTS "howManyMaleChildrenAttendTheSchool_temp" INTEGER,
ADD COLUMN IF NOT EXISTS "howManySpecialNeedsGirlsAttendTheSchool_temp" INTEGER,
ADD COLUMN IF NOT EXISTS "howManySpecialNeedsBoysAttendTheSchool_temp" INTEGER,
ADD COLUMN IF NOT EXISTS "howManyMaleTeachersDoesTheSchoolsHave_temp" INTEGER,
ADD COLUMN IF NOT EXISTS "howManyFemaleTeachersDoesTheSchoolsHave_temp" INTEGER;

-- Convert values (simplified - just the first field as example)
UPDATE "impact_survey" 
SET "howManyFemaleChildrenAttendTheSchool_temp" = CASE 
  WHEN "howManyFemaleChildrenAttendTheSchool" IS NULL OR TRIM("howManyFemaleChildrenAttendTheSchool") = '' THEN NULL
  WHEN "howManyFemaleChildrenAttendTheSchool"::text LIKE '%#%' OR "howManyFemaleChildrenAttendTheSchool"::text LIKE '%ERROR%' THEN NULL
  ELSE CAST(REGEXP_REPLACE(TRIM("howManyFemaleChildrenAttendTheSchool"::text), '[^0-9-]', '', 'g') AS INTEGER)
END;
-- (Repeat for other 5 fields...)
SQL

# Step 3: Mark as applied
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112192307_update_impact_survey_fields_to_numeric

# Step 4: Apply remaining migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

### Option 3: Update Migration File on Server

If you have access to edit files on the server:

```bash
# Edit the migration file
nano prisma/migrations/20260112192307_update_impact_survey_fields_to_numeric/migration.sql

# Replace all "ImpactSurvey" with "impact_survey"
# Then mark as rolled back and reapply
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112192307_update_impact_survey_fields_to_numeric
docker compose exec nestjs_app npx prisma migrate deploy
```

## After Fixing

Once this migration is resolved, the remaining migration (`20260112203401_convert_first_disbursement_to_string`) should apply automatically.
