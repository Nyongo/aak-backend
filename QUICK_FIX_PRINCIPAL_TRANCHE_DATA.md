# Quick Fix for Principal Tranche initialDisbursementDateInContract Data Format

## Problem
The `initialDisbursementDateInContract` column is already TEXT (correct type), but the data values are stored in timestamp format strings (e.g., "2025-12-22 00:00:00 +00:00") instead of "Month DD, YYYY" format (e.g., "December 22, 2025"). Prisma expects the "Month DD, YYYY" format.

## Solution
The migration has been updated to convert existing timestamp-formatted string values to "Month DD, YYYY" format.

## Steps to Fix on Remote Server

### Option 1: Apply the Updated Migration

After deploying the updated migration file, run:

```bash
docker compose exec nestjs_app npx prisma migrate deploy
```

### Option 2: Manual Data Conversion

If you want to fix the data immediately without waiting for deployment:

```bash
# Connect to database and convert the data
docker compose exec postgres psql -U postgres -d nest << 'EOF'
UPDATE "principal_tranches" 
SET "initialDisbursementDateInContract" = CASE 
  WHEN "initialDisbursementDateInContract" IS NULL OR TRIM("initialDisbursementDateInContract") = '' THEN NULL
  WHEN "initialDisbursementDateInContract" ~ '^\d{4}-\d{2}-\d{2}' THEN
    -- Convert timestamp format to "Month DD, YYYY"
    TRIM(TO_CHAR(("initialDisbursementDateInContract"::text)::timestamp, 'FMMonth DD, YYYY'))
  WHEN "initialDisbursementDateInContract" ~ '^[A-Za-z]+\s+\d{1,2},\s+\d{4}$' THEN
    -- Already in correct format
    "initialDisbursementDateInContract"
  ELSE
    -- Try to parse and convert
    CASE 
      WHEN ("initialDisbursementDateInContract"::text)::timestamp IS NOT NULL THEN
        TRIM(TO_CHAR(("initialDisbursementDateInContract"::text)::timestamp, 'FMMonth DD, YYYY'))
      ELSE
        "initialDisbursementDateInContract"
    END
END;
EOF

# Then mark the migration as applied (if it exists)
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112210000_convert_principal_tranche_initial_disbursement_to_string || echo "Migration not found, that's okay"
```

### Option 3: Check Current Data Format First

Before fixing, check what format the data is currently in:

```bash
docker compose exec postgres psql -U postgres -d nest -c "
SELECT \"sheetId\", \"initialDisbursementDateInContract\" 
FROM \"principal_tranches\" 
WHERE \"initialDisbursementDateInContract\" IS NOT NULL 
LIMIT 10;
"
```

If you see values like "2025-12-22 00:00:00 +00:00", they need to be converted to "December 22, 2025".

## After Fixing

Verify the data is in the correct format:

```bash
docker compose exec postgres psql -U postgres -d nest -c "
SELECT \"sheetId\", \"initialDisbursementDateInContract\" 
FROM \"principal_tranches\" 
WHERE \"initialDisbursementDateInContract\" IS NOT NULL 
LIMIT 5;
"
```

Values should now be in "Month DD, YYYY" format (e.g., "December 22, 2025").
