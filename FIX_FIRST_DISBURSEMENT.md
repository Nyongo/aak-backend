# Fix firstDisbursement Field Type Issue

## Problem
The `firstDisbursement` field in the `Loan` table is stored as `TIMESTAMP` in the database, but Prisma schema expects `String?` (TEXT). This causes errors when reading from the database:
```
Error converting field "firstDisbursement" of expected non-nullable type "String", 
found incompatible value of "2022-05-13 00:00:00 +00:00"
```

## Solution
A migration has been created to convert the `firstDisbursement` column from TIMESTAMP to TEXT, formatting existing values to DD/MM/YYYY format.

## Steps to Fix on Remote Server

### Step 1: Copy the Migration File
The migration file is located at:
```
prisma/migrations/20260112203401_convert_first_disbursement_to_string/migration.sql
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
WHERE table_name = 'Loan' 
AND column_name = 'firstDisbursement';
"

# Check a sample value
docker compose exec postgres psql -U postgres -d nest -c "
SELECT \"sheetId\", \"firstDisbursement\" 
FROM \"Loan\" 
WHERE \"firstDisbursement\" IS NOT NULL 
LIMIT 5;
"
```

The `data_type` should show `text` and values should be in `DD/MM/YYYY` format.

### Step 4: Test the Import

Try running the import again:

```bash
# Test the import endpoint
curl -X POST http://localhost:3000/jf/loans-migration/import-from-sheets
```

## Migration Details

The migration:
1. Checks if the column is TIMESTAMP or TEXT
2. If TIMESTAMP: converts to TEXT with DD/MM/YYYY format
3. If TEXT with timestamp strings: converts those to DD/MM/YYYY format
4. Preserves NULL values

## If Migration Fails

If the migration fails, you can manually fix it:

```bash
# Connect to database
docker compose exec postgres psql -U postgres -d nest

# Then run:
ALTER TABLE "Loan" ADD COLUMN "firstDisbursement_temp" TEXT;

UPDATE "Loan" 
SET "firstDisbursement_temp" = CASE 
  WHEN "firstDisbursement" IS NULL THEN NULL
  ELSE TO_CHAR("firstDisbursement"::timestamp, 'DD/MM/YYYY')
END;

ALTER TABLE "Loan" DROP COLUMN "firstDisbursement";
ALTER TABLE "Loan" RENAME COLUMN "firstDisbursement_temp" TO "firstDisbursement";
```
