-- AlterTable: Convert 6 fields from TEXT to INTEGER
-- Add temporary columns for numeric conversions
ALTER TABLE "ImpactSurvey" 
ADD COLUMN "howManyFemaleChildrenAttendTheSchool_temp" INTEGER,
ADD COLUMN "howManyMaleChildrenAttendTheSchool_temp" INTEGER,
ADD COLUMN "howManySpecialNeedsGirlsAttendTheSchool_temp" INTEGER,
ADD COLUMN "howManySpecialNeedsBoysAttendTheSchool_temp" INTEGER,
ADD COLUMN "howManyMaleTeachersDoesTheSchoolsHave_temp" INTEGER,
ADD COLUMN "howManyFemaleTeachersDoesTheSchoolsHave_temp" INTEGER;

-- Convert howManyFemaleChildrenAttendTheSchool: Parse to integer
UPDATE "ImpactSurvey" 
SET "howManyFemaleChildrenAttendTheSchool_temp" = CASE 
  WHEN "howManyFemaleChildrenAttendTheSchool" IS NULL OR TRIM("howManyFemaleChildrenAttendTheSchool") = '' OR TRIM("howManyFemaleChildrenAttendTheSchool") = '(empty)' THEN NULL
  WHEN "howManyFemaleChildrenAttendTheSchool"::text LIKE '%#%' OR "howManyFemaleChildrenAttendTheSchool"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManyFemaleChildrenAttendTheSchool"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManyFemaleChildrenAttendTheSchool"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert howManyMaleChildrenAttendTheSchool: Parse to integer
UPDATE "ImpactSurvey" 
SET "howManyMaleChildrenAttendTheSchool_temp" = CASE 
  WHEN "howManyMaleChildrenAttendTheSchool" IS NULL OR TRIM("howManyMaleChildrenAttendTheSchool") = '' OR TRIM("howManyMaleChildrenAttendTheSchool") = '(empty)' THEN NULL
  WHEN "howManyMaleChildrenAttendTheSchool"::text LIKE '%#%' OR "howManyMaleChildrenAttendTheSchool"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManyMaleChildrenAttendTheSchool"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManyMaleChildrenAttendTheSchool"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert howManySpecialNeedsGirlsAttendTheSchool: Parse to integer
UPDATE "ImpactSurvey" 
SET "howManySpecialNeedsGirlsAttendTheSchool_temp" = CASE 
  WHEN "howManySpecialNeedsGirlsAttendTheSchool" IS NULL OR TRIM("howManySpecialNeedsGirlsAttendTheSchool") = '' OR TRIM("howManySpecialNeedsGirlsAttendTheSchool") = '(empty)' THEN NULL
  WHEN "howManySpecialNeedsGirlsAttendTheSchool"::text LIKE '%#%' OR "howManySpecialNeedsGirlsAttendTheSchool"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManySpecialNeedsGirlsAttendTheSchool"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManySpecialNeedsGirlsAttendTheSchool"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert howManySpecialNeedsBoysAttendTheSchool: Parse to integer
UPDATE "ImpactSurvey" 
SET "howManySpecialNeedsBoysAttendTheSchool_temp" = CASE 
  WHEN "howManySpecialNeedsBoysAttendTheSchool" IS NULL OR TRIM("howManySpecialNeedsBoysAttendTheSchool") = '' OR TRIM("howManySpecialNeedsBoysAttendTheSchool") = '(empty)' THEN NULL
  WHEN "howManySpecialNeedsBoysAttendTheSchool"::text LIKE '%#%' OR "howManySpecialNeedsBoysAttendTheSchool"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManySpecialNeedsBoysAttendTheSchool"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManySpecialNeedsBoysAttendTheSchool"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert howManyMaleTeachersDoesTheSchoolsHave: Parse to integer
UPDATE "ImpactSurvey" 
SET "howManyMaleTeachersDoesTheSchoolsHave_temp" = CASE 
  WHEN "howManyMaleTeachersDoesTheSchoolsHave" IS NULL OR TRIM("howManyMaleTeachersDoesTheSchoolsHave") = '' OR TRIM("howManyMaleTeachersDoesTheSchoolsHave") = '(empty)' THEN NULL
  WHEN "howManyMaleTeachersDoesTheSchoolsHave"::text LIKE '%#%' OR "howManyMaleTeachersDoesTheSchoolsHave"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManyMaleTeachersDoesTheSchoolsHave"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManyMaleTeachersDoesTheSchoolsHave"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Convert howManyFemaleTeachersDoesTheSchoolsHave: Parse to integer
UPDATE "ImpactSurvey" 
SET "howManyFemaleTeachersDoesTheSchoolsHave_temp" = CASE 
  WHEN "howManyFemaleTeachersDoesTheSchoolsHave" IS NULL OR TRIM("howManyFemaleTeachersDoesTheSchoolsHave") = '' OR TRIM("howManyFemaleTeachersDoesTheSchoolsHave") = '(empty)' THEN NULL
  WHEN "howManyFemaleTeachersDoesTheSchoolsHave"::text LIKE '%#%' OR "howManyFemaleTeachersDoesTheSchoolsHave"::text LIKE '%ERROR%' THEN NULL
  WHEN REGEXP_REPLACE(TRIM("howManyFemaleTeachersDoesTheSchoolsHave"::text), '[^0-9-]', '', 'g') = '' THEN NULL
  ELSE CAST(
    REGEXP_REPLACE(TRIM("howManyFemaleTeachersDoesTheSchoolsHave"::text), '[^0-9-]', '', 'g') AS INTEGER
  )
END;

-- Drop old columns
ALTER TABLE "ImpactSurvey" 
DROP COLUMN "howManyFemaleChildrenAttendTheSchool",
DROP COLUMN "howManyMaleChildrenAttendTheSchool",
DROP COLUMN "howManySpecialNeedsGirlsAttendTheSchool",
DROP COLUMN "howManySpecialNeedsBoysAttendTheSchool",
DROP COLUMN "howManyMaleTeachersDoesTheSchoolsHave",
DROP COLUMN "howManyFemaleTeachersDoesTheSchoolsHave";

-- Rename temporary columns to original names
ALTER TABLE "ImpactSurvey" 
RENAME COLUMN "howManyFemaleChildrenAttendTheSchool_temp" TO "howManyFemaleChildrenAttendTheSchool";
ALTER TABLE "ImpactSurvey" 
RENAME COLUMN "howManyMaleChildrenAttendTheSchool_temp" TO "howManyMaleChildrenAttendTheSchool";
ALTER TABLE "ImpactSurvey" 
RENAME COLUMN "howManySpecialNeedsGirlsAttendTheSchool_temp" TO "howManySpecialNeedsGirlsAttendTheSchool";
ALTER TABLE "ImpactSurvey" 
RENAME COLUMN "howManySpecialNeedsBoysAttendTheSchool_temp" TO "howManySpecialNeedsBoysAttendTheSchool";
ALTER TABLE "ImpactSurvey" 
RENAME COLUMN "howManyMaleTeachersDoesTheSchoolsHave_temp" TO "howManyMaleTeachersDoesTheSchoolsHave";
ALTER TABLE "ImpactSurvey" 
RENAME COLUMN "howManyFemaleTeachersDoesTheSchoolsHave_temp" TO "howManyFemaleTeachersDoesTheSchoolsHave";
