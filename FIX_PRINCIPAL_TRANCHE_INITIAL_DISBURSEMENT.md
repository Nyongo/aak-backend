# Fix Principal Tranche initialDisbursementDateInContract Field Type Issue

## Problem
The `initialDisbursementDateInContract` field in the `principal_tranches` table is stored as `TIMESTAMP` in the database, but Prisma schema expects `String?` (TEXT) in "Month DD, YYYY" format (e.g., "May 5, 2022"). This causes errors when reading from the database:
```
Error converting field "initialDisbursementDateInContract" of expected non-nullable type "String", 
found incompatible value of "2025-12-22 00:00:00 +00:00"
```

## Solution
A migration has been created to convert the `initialDisbursementDateInContract` column from TIMESTAMP to TEXT, formatting existing values to "Month DD, YYYY" format.

## Steps to Fix on Remote Server

### Step 1: Copy the Migration File
The migration file is located at:
```
prisma/migrations/20260112210000_convert_principal_tranche_initial_disbursement_to_string/migration.sql
```

Make sure this file is included in your deployment.

### Step 2: Apply the Migration

On your remote server, run:

```bash
# Navigate to your app directory
cd /applications/aak-backend  # or wherever your app is

# Apply the migration
docker compose exec nestjs_app npx prisma migrate deploy
```

### Step 3: Verify the Fix

Check that the column type has been converted:

```bash
# Check column type
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'principal_tranches' 
AND column_name = 'initialDisbursementDateInContract';
"

# Check a sample value
docker compose exec postgres psql -U postgres -d nest -c "
SELECT \"sheetId\", \"initialDisbursementDateInContract\" 
FROM \"principal_tranches\" 
WHERE \"initialDisbursementDateInContract\" IS NOT NULL 
LIMIT 5;
"
```

The `data_type` should show `text` and values should be in "Month DD, YYYY" format (e.g., "December 22, 2025").

### Step 4: Test the Application

Try querying Principal Tranches again - the error should be resolved.

## Migration Details

The migration:
1. Checks if the column is TIMESTAMP or TEXT
2. If TIMESTAMP: converts to TEXT with "Month DD, YYYY" format
3. If TEXT with timestamp strings: converts those to "Month DD, YYYY" format
4. Preserves NULL values

## If Migration Fails

If the migration fails, you can manually fix it:

```bash
# Connect to database
docker compose exec postgres psql -U postgres -d nest

# Then run:
ALTER TABLE "principal_tranches" ADD COLUMN "initialDisbursementDateInContract_temp" TEXT;

UPDATE "principal_tranches" 
SET "initialDisbursementDateInContract_temp" = CASE 
  WHEN "initialDisbursementDateInContract" IS NULL THEN NULL
  ELSE TRIM(TO_CHAR("initialDisbursementDateInContract"::timestamp, 'FMMonth DD, YYYY'))
END;

ALTER TABLE "principal_tranches" DROP COLUMN "initialDisbursementDateInContract";
ALTER TABLE "principal_tranches" RENAME COLUMN "initialDisbursementDateInContract_temp" TO "initialDisbursementDateInContract";
```
