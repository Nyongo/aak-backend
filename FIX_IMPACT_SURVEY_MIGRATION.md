# Fix Impact Survey Migration Error

## Problem
The migration `20260112192307_update_impact_survey_fields_to_numeric` is failing with:
```
ERROR: relation "ImpactSurvey" does not exist
```

This happens because the migration uses `"ImpactSurvey"` (PascalCase) but the actual table name in the database is `"impact_survey"` (snake_case).

## Solution
The migration has been updated to use the correct table name `"impact_survey"` throughout.

## Steps to Fix on Remote Server

### Step 1: Mark the Failed Migration as Rolled Back

```bash
# Navigate to your app directory
cd /applications/aak-backend

# Mark the failed migration as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112192307_update_impact_survey_fields_to_numeric
```

### Step 2: Deploy Updated Migration

After you've deployed the updated migration file (with the correct table name), run:

```bash
# Apply all pending migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

The updated migration will now use `"impact_survey"` instead of `"ImpactSurvey"`.

### Step 3: Verify

Check that the columns were converted correctly:

```bash
# Check column types
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'impact_survey' 
AND column_name IN (
  'howManyFemaleChildrenAttendTheSchool',
  'howManyMaleChildrenAttendTheSchool',
  'howManySpecialNeedsGirlsAttendTheSchool',
  'howManySpecialNeedsBoysAttendTheSchool',
  'howManyMaleTeachersDoesTheSchoolsHave',
  'howManyFemaleTeachersDoesTheSchoolsHave'
)
ORDER BY column_name;
"
```

All 6 columns should show `integer` as the data type.

## After Fixing

Once this migration is resolved, the remaining migration (`20260112203401_convert_first_disbursement_to_string`) should apply automatically.
