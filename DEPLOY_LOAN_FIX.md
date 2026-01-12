# Deploy Loan firstDisbursement Fix

## Migration Details
- **Migration**: `20260112203401_convert_first_disbursement_to_string`
- **Purpose**: Converts `firstDisbursement` from TIMESTAMP to TEXT (DD/MM/YYYY format)
- **Table**: `Loan`
- **Field**: `firstDisbursement`

## Pre-Deployment Checklist

✅ **Loan data is importing successfully** (as you mentioned)
✅ Migration file exists: `prisma/migrations/20260112203401_convert_first_disbursement_to_string/migration.sql`
✅ Prisma schema has `firstDisbursement` as `String?`

## Deployment Steps

### Step 1: Backup (Optional but Recommended)

```bash
# On remote server, backup the Loan table
docker compose exec postgres pg_dump -U postgres -d nest -t "Loan" --data-only > loan_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Check Current Column Type

```bash
# Verify the current state
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND column_name = 'firstDisbursement';
"
```

**Expected**: Should show `timestamp without time zone` (needs conversion) or `text` (already converted)

### Step 3: Apply the Migration

```bash
# Navigate to your app directory
cd /applications/aak-backend  # or wherever your app is

# Apply the migration
docker compose exec nestjs_app npx prisma migrate deploy
```

### Step 4: Verify the Fix

```bash
# Check column type (should be 'text')
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND column_name = 'firstDisbursement';
"

# Check sample data format (should be DD/MM/YYYY)
docker compose exec postgres psql -U postgres -d nest -c "
SELECT \"sheetId\", \"firstDisbursement\" 
FROM \"Loan\" 
WHERE \"firstDisbursement\" IS NOT NULL 
LIMIT 5;
"
```

### Step 5: Test Loan Import

After the migration, test importing Loan data again to ensure everything works:

```bash
# Test the import endpoint (if you have one)
curl -X POST http://localhost:3000/jf/loans-migration/import-from-sheets
```

## What the Migration Does

1. **If column is TIMESTAMP**: 
   - Creates temporary TEXT column
   - Converts all TIMESTAMP values to DD/MM/YYYY format strings
   - Drops old TIMESTAMP column
   - Renames temporary column to `firstDisbursement`

2. **If column is already TEXT**:
   - Converts any timestamp-formatted strings (YYYY-MM-DD) to DD/MM/YYYY
   - Leaves already-formatted values unchanged

## Rollback (If Needed)

If something goes wrong, you can rollback:

```bash
# Mark migration as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112203401_convert_first_disbursement_to_string

# Restore from backup if needed
docker compose exec postgres psql -U postgres -d nest < loan_backup_YYYYMMDD_HHMMSS.sql
```

## After Successful Deployment

Once this migration is applied successfully:
- ✅ `firstDisbursement` will be stored as TEXT in DD/MM/YYYY format
- ✅ Loan imports should continue working
- ✅ No more type mismatch errors for `firstDisbursement`

## Next Steps

After Loan is fixed, we can move on to:
- PrincipalTranche `initialDisbursementDateInContract` (DateTime)
- Any other pending migrations
