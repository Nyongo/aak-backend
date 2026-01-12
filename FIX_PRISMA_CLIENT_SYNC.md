# Fix Prisma Client Sync Issue

## Problem
Error: `incorrect binary data format in bind parameter 57`

This error occurs when the Prisma client in the Docker image doesn't match the current database schema. The client expects certain data types, but the database schema has changed.

## Root Cause
The Prisma client needs to be regenerated after schema changes. If the Docker image was built before the schema changes, the client will be out of sync.

## Solution

### Option 1: Rebuild Docker Image (Recommended)

The Docker image needs to be rebuilt to regenerate the Prisma client:

```bash
# On remote server
cd /applications/aak-backend

# Rebuild the image (this will regenerate Prisma client)
docker compose build nestjs_app

# Restart container
docker compose up -d --force-recreate nestjs_app

# Wait for container to start
sleep 10

# Verify Prisma client is up to date
docker compose exec nestjs_app npx prisma generate
```

### Option 2: Regenerate Prisma Client in Running Container (Temporary Fix)

If you can't rebuild immediately:

```bash
# Regenerate Prisma client in the running container
docker compose exec nestjs_app npx prisma generate

# Restart the container
docker compose restart nestjs_app
```

**Note**: This is temporary - the client will be lost if the container is recreated. Rebuild the image for a permanent fix.

### Option 3: Check Schema vs Database Mismatch

Verify the database schema matches Prisma schema:

```bash
# Check if migrations are applied
docker compose exec nestjs_app npx prisma migrate status

# Check database schema
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND column_name IN ('principalAmount', 'outstandingPrincipalBalance', 'numberOfMonths', 'daysLate', 'hasFemaleDirector', 'outstandingInterestBalance', 'firstDisbursement')
ORDER BY column_name;
"
```

## Code Fix Applied

I've also updated `loans.service.ts` to:
1. Clean and convert data types before saving
2. Ensure numeric fields are numbers (not strings)
3. Ensure integer fields are integers (not strings)
4. Remove undefined values (Prisma doesn't accept undefined)
5. Add better error logging to identify problematic fields

## After Fixing

1. **Rebuild the Docker image** (most important)
2. **Apply any pending migrations**
3. **Test the import again**

The updated service code will also help catch and convert any type mismatches.

## Verification

After rebuilding, test the import:

```bash
curl -X POST http://localhost:3000/jf/loans-migration/import-from-sheets
```

Check logs for any remaining errors:

```bash
docker compose logs nestjs_app --tail 100 | grep -i error
```
