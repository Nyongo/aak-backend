#!/bin/bash

# Quick fix script to run on remote server
# This manually applies the corrected migration SQL

echo "🔧 Fixing Impact Survey migration on remote server..."
echo ""

# Step 1: Mark the failed migration as rolled back
echo "Step 1: Marking migration as rolled back..."
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112192307_update_impact_survey_fields_to_numeric

# Step 2: Manually run the corrected SQL
echo ""
echo "Step 2: Applying corrected migration SQL..."
docker compose exec postgres psql -U postgres -d nest << 'EOF'
-- AlterTable: Convert 6 fields from TEXT to INTEGER
-- Add temporary columns for numeric conversions
ALTER TABLE "impact_survey" 
ADD COLUMN IF NOT EXISTS "howManyFemaleChildrenAttendTheSchool_temp" INTEGER,
ADD COLUMN IF NOT EXISTS "howManyMaleChildrenAttendTheSchool_temp" INTEGER,
ADD COLUMN IF NOT EXISTS "howManySpecialNeedsGirlsAttendTheSchool_temp" INTEGER,
ADD COLUMN IF NOT EXISTS "howManySpecialNeedsBoysAttendTheSchool_temp" INTEGER,
ADD COLUMN IF NOT EXISTS "howManyMaleTeachersDoesTheSchoolsHave_temp" INTEGER,
ADD COLUMN IF NOT EXISTS "howManyFemaleTeachersDoesTheSchoolsHave_temp" INTEGER;

-- Convert howManyFemaleChildrenAttendTheSchool: Parse to integer
UPDATE "impact_survey" 
SET "howManyFemaleChildrenAttendTheSchool_temp" = CASE 
  WHEN "howManyFemaleChildrenAttendTheSchool" IS NULL OR TRIM("howManyFemaleChildrenAttendTheSchool") = '' OR TRIM("howManyFemaleChildrenAttendTheSchool") = '(empty)' THEN NULL
  WHEN "howManyFemaleChildrenAttendTheSchool"::text LIKE '%#%' OR "howManyFemaleChildrenAttendTheSchool"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManyFemaleChildrenAttendTheSchool"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManyFemaleChildrenAttendTheSchool"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert howManyMaleChildrenAttendTheSchool: Parse to integer
UPDATE "impact_survey" 
SET "howManyMaleChildrenAttendTheSchool_temp" = CASE 
  WHEN "howManyMaleChildrenAttendTheSchool" IS NULL OR TRIM("howManyMaleChildrenAttendTheSchool") = '' OR TRIM("howManyMaleChildrenAttendTheSchool") = '(empty)' THEN NULL
  WHEN "howManyMaleChildrenAttendTheSchool"::text LIKE '%#%' OR "howManyMaleChildrenAttendTheSchool"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManyMaleChildrenAttendTheSchool"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManyMaleChildrenAttendTheSchool"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert howManySpecialNeedsGirlsAttendTheSchool: Parse to integer
UPDATE "impact_survey" 
SET "howManySpecialNeedsGirlsAttendTheSchool_temp" = CASE 
  WHEN "howManySpecialNeedsGirlsAttendTheSchool" IS NULL OR TRIM("howManySpecialNeedsGirlsAttendTheSchool") = '' OR TRIM("howManySpecialNeedsGirlsAttendTheSchool") = '(empty)' THEN NULL
  WHEN "howManySpecialNeedsGirlsAttendTheSchool"::text LIKE '%#%' OR "howManySpecialNeedsGirlsAttendTheSchool"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManySpecialNeedsGirlsAttendTheSchool"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManySpecialNeedsGirlsAttendTheSchool"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert howManySpecialNeedsBoysAttendTheSchool: Parse to integer
UPDATE "impact_survey" 
SET "howManySpecialNeedsBoysAttendTheSchool_temp" = CASE 
  WHEN "howManySpecialNeedsBoysAttendTheSchool" IS NULL OR TRIM("howManySpecialNeedsBoysAttendTheSchool") = '' OR TRIM("howManySpecialNeedsBoysAttendTheSchool") = '(empty)' THEN NULL
  WHEN "howManySpecialNeedsBoysAttendTheSchool"::text LIKE '%#%' OR "howManySpecialNeedsBoysAttendTheSchool"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManySpecialNeedsBoysAttendTheSchool"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManySpecialNeedsBoysAttendTheSchool"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert howManyMaleTeachersDoesTheSchoolsHave: Parse to integer
UPDATE "impact_survey" 
SET "howManyMaleTeachersDoesTheSchoolsHave_temp" = CASE 
  WHEN "howManyMaleTeachersDoesTheSchoolsHave" IS NULL OR TRIM("howManyMaleTeachersDoesTheSchoolsHave") = '' OR TRIM("howManyMaleTeachersDoesTheSchoolsHave") = '(empty)' THEN NULL
  WHEN "howManyMaleTeachersDoesTheSchoolsHave"::text LIKE '%#%' OR "howManyMaleTeachersDoesTheSchoolsHave"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManyMaleTeachersDoesTheSchoolsHave"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManyMaleTeachersDoesTheSchoolsHave"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert howManyFemaleTeachersDoesTheSchoolsHave: Parse to integer
UPDATE "impact_survey" 
SET "howManyFemaleTeachersDoesTheSchoolsHave_temp" = CASE 
  WHEN "howManyFemaleTeachersDoesTheSchoolsHave" IS NULL OR TRIM("howManyFemaleTeachersDoesTheSchoolsHave") = '' OR TRIM("howManyFemaleTeachersDoesTheSchoolsHave") = '(empty)' THEN NULL
  WHEN "howManyFemaleTeachersDoesTheSchoolsHave"::text LIKE '%#%' OR "howManyFemaleTeachersDoesTheSchoolsHave"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManyFemaleTeachersDoesTheSchoolsHave"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManyFemaleTeachersDoesTheSchoolsHave"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Drop old columns (only if they exist and are TEXT)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'impact_survey' 
    AND column_name = 'howManyFemaleChildrenAttendTheSchool'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "impact_survey" DROP COLUMN "howManyFemaleChildrenAttendTheSchool";
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'impact_survey' 
    AND column_name = 'howManyMaleChildrenAttendTheSchool'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "impact_survey" DROP COLUMN "howManyMaleChildrenAttendTheSchool";
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'impact_survey' 
    AND column_name = 'howManySpecialNeedsGirlsAttendTheSchool'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "impact_survey" DROP COLUMN "howManySpecialNeedsGirlsAttendTheSchool";
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'impact_survey' 
    AND column_name = 'howManySpecialNeedsBoysAttendTheSchool'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "impact_survey" DROP COLUMN "howManySpecialNeedsBoysAttendTheSchool";
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'impact_survey' 
    AND column_name = 'howManyMaleTeachersDoesTheSchoolsHave'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "impact_survey" DROP COLUMN "howManyMaleTeachersDoesTheSchoolsHave";
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'impact_survey' 
    AND column_name = 'howManyFemaleTeachersDoesTheSchoolsHave'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE "impact_survey" DROP COLUMN "howManyFemaleTeachersDoesTheSchoolsHave";
  END IF;
END $$;

-- Rename temporary columns to original names
ALTER TABLE "impact_survey" 
RENAME COLUMN "howManyFemaleChildrenAttendTheSchool_temp" TO "howManyFemaleChildrenAttendTheSchool";
ALTER TABLE "impact_survey" 
RENAME COLUMN "howManyMaleChildrenAttendTheSchool_temp" TO "howManyMaleChildrenAttendTheSchool";
ALTER TABLE "impact_survey" 
RENAME COLUMN "howManySpecialNeedsGirlsAttendTheSchool_temp" TO "howManySpecialNeedsGirlsAttendTheSchool";
ALTER TABLE "impact_survey" 
RENAME COLUMN "howManySpecialNeedsBoysAttendTheSchool_temp" TO "howManySpecialNeedsBoysAttendTheSchool";
ALTER TABLE "impact_survey" 
RENAME COLUMN "howManyMaleTeachersDoesTheSchoolsHave_temp" TO "howManyMaleTeachersDoesTheSchoolsHave";
ALTER TABLE "impact_survey" 
RENAME COLUMN "howManyFemaleTeachersDoesTheSchoolsHave_temp" TO "howManyFemaleTeachersDoesTheSchoolsHave";
EOF

# Step 3: Mark migration as applied
echo ""
echo "Step 3: Marking migration as applied..."
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112192307_update_impact_survey_fields_to_numeric

# Step 4: Apply remaining migrations
echo ""
echo "Step 4: Applying remaining migrations..."
docker compose exec nestjs_app npx prisma migrate deploy

echo ""
echo "✅ Done!"
