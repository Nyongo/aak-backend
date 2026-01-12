# Complete Fix for Loan Import Error

## Problem
Error: `incorrect binary data format in bind parameter 57`

This error occurs because:
1. **Prisma client is out of sync** - Generated before schema changes
2. **Code changes not in Docker image** - Updated `loans.service.ts` needs to be built into the image

## Complete Solution

### Step 1: Pull Latest Code (with fixes)

```bash
cd /applications/aak-backend
git pull origin main
```

### Step 2: Rebuild Docker Image

This is **CRITICAL** - it will:
- Regenerate Prisma client with latest schema
- Build updated TypeScript code (including `loans.service.ts` fixes)
- Include all migration files

```bash
# Rebuild the image
docker compose build nestjs_app

# This takes a few minutes - it will:
# - Install dependencies
# - Generate Prisma client (with updated schema)
# - Compile TypeScript to JavaScript
# - Copy migration files
```

### Step 3: Restart Container

```bash
# Stop and recreate container with new image
docker compose up -d --force-recreate nestjs_app

# Wait for container to start
sleep 10

# Check container is running
docker compose ps
```

### Step 4: Verify Prisma Client

```bash
# Check Prisma client was regenerated
docker compose exec nestjs_app npx prisma --version

# Verify migrations are applied
docker compose exec nestjs_app npx prisma migrate status
```

### Step 5: Test Import

```bash
# Test the import
curl -X POST http://localhost:3000/jf/loans-migration/import-from-sheets

# Or check logs in real-time
docker compose logs -f nestjs_app
```

## What Gets Fixed

1. **Prisma Client**: Regenerated with correct types for:
   - `principalAmount`: Float (not String)
   - `outstandingPrincipalBalance`: Float (not String)
   - `outstandingInterestBalance`: Float (not String)
   - `numberOfMonths`: Int (not String)
   - `daysLate`: Int (not String)
   - `hasFemaleDirector`: Int (not String)
   - `firstDisbursement`: String (DD/MM/YYYY format)

2. **Service Code**: Updated `loans.service.ts` that:
   - Converts string numbers to actual numbers
   - Converts string integers to actual integers
   - Removes undefined values
   - Provides better error logging

## If Error Persists

### Debug the Issue

Run the debug script:

```bash
chmod +x debug-loan-import.sh
./debug-loan-import.sh
```

### Check Application Logs

```bash
# Check for detailed error messages
docker compose logs nestjs_app --tail 200 | grep -i "error\|loan\|bind parameter"

# Check for field type information
docker compose logs nestjs_app --tail 200 | grep -A 10 "Field types"
```

### Manual Prisma Client Regeneration

If rebuild doesn't work:

```bash
# Regenerate in container
docker compose exec nestjs_app npx prisma generate

# Restart
docker compose restart nestjs_app
```

### Check Database vs Schema

```bash
# Compare database column types with Prisma schema
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND column_name IN (
  'principalAmount',
  'outstandingPrincipalBalance', 
  'numberOfMonths',
  'daysLate',
  'hasFemaleDirector',
  'outstandingInterestBalance',
  'firstDisbursement'
)
ORDER BY column_name;
"
```

**Expected types:**
- `principalAmount`: `double precision`
- `outstandingPrincipalBalance`: `double precision`
- `outstandingInterestBalance`: `double precision`
- `numberOfMonths`: `integer`
- `daysLate`: `integer`
- `hasFemaleDirector`: `integer`
- `firstDisbursement`: `text`

## Quick One-Liner Fix

```bash
cd /applications/aak-backend && \
git pull origin main && \
docker compose build nestjs_app && \
docker compose up -d --force-recreate nestjs_app && \
sleep 10 && \
docker compose exec nestjs_app npx prisma migrate deploy && \
echo "✅ Ready! Test import now."
```

## After Fix

Once the import works:
- ✅ Loans will import successfully
- ✅ All numeric fields will be stored correctly
- ✅ No more type mismatch errors
- ✅ You can move on to fixing PrincipalTranche
