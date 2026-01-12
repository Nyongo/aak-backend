# Fix Failed Migration on Remote Server

## Problem
The migration `20260112153158_update_loan_fields_to_numeric` failed, blocking all new migrations.

## Quick Fix Commands

Run these commands **on your remote server**:

### Step 1: Check Migration Status
```bash
docker compose exec nestjs_app npx prisma migrate status
```

### Step 2: Check if Migration Partially Applied
```bash
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND (column_name LIKE '%_temp%' OR column_name IN ('principalAmount', 'numberOfMonths', 'outstandingPrincipalBalance', 'daysLate', 'hasFemaleDirector', 'outstandingInterestBalance'))
ORDER BY column_name;
"
```

### Step 3: Resolve the Failed Migration

**If you see `_temp` columns** (migration partially applied):
```bash
# Clean up temp columns first
docker compose exec postgres psql -U postgres -d nest -c "
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"principalAmount_temp\";
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"numberOfMonths_temp\";
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"outstandingPrincipalBalance_temp\";
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"daysLate_temp\";
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"hasFemaleDirector_temp\";
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"outstandingInterestBalance_temp\";
"

# Mark as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric
```

**If no temp columns exist** (migration fully failed):
```bash
# Mark as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric
```

**If database is already in correct state** (columns already converted):
```bash
# Mark as applied (USE WITH CAUTION - only if columns are already correct types)
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112153158_update_loan_fields_to_numeric
```

### Step 4: Run Remaining Migrations
```bash
docker compose exec nestjs_app npx prisma migrate deploy
```

### Step 5: Verify
```bash
docker compose exec nestjs_app npx prisma migrate status
```

## Alternative: Use db push (if migrations are too complex)

If resolving the migration is too complex, you can sync the schema directly:

```bash
docker compose exec nestjs_app npx prisma db push --accept-data-loss
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112153158_update_loan_fields_to_numeric
docker compose exec nestjs_app npx prisma migrate deploy
```

## Check Column Types

To verify the current state of Loan table columns:

```bash
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND column_name IN ('principalAmount', 'numberOfMonths', 'outstandingPrincipalBalance', 'daysLate', 'hasFemaleDirector', 'outstandingInterestBalance')
ORDER BY column_name;
"
```

Expected types:
- `principalAmount`: `double precision`
- `numberOfMonths`: `integer`
- `outstandingPrincipalBalance`: `double precision`
- `daysLate`: `integer`
- `hasFemaleDirector`: `integer`
- `outstandingInterestBalance`: `double precision`
