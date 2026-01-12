# Fix Principal Tranche Migration Error

## Problem
The migration `20260112160000_update_principal_tranche_amount_to_numeric` is failing with:
```
ERROR: function pg_catalog.btrim(numeric) does not exist
```

This happens because the `amount` column is already numeric (not TEXT), but the migration tries to use `TRIM()` which only works on text types.

## Solution
The migration has been updated to:
1. Check the column type first
2. If TEXT: convert to DOUBLE PRECISION
3. If already numeric: ensure it's DOUBLE PRECISION (no conversion needed)

## Steps to Fix on Remote Server

### Step 1: Mark the Failed Migration as Rolled Back

```bash
# Navigate to your app directory
cd /applications/aak-backend

# Mark the failed migration as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112160000_update_principal_tranche_amount_to_numeric
```

### Step 2: Check Current Column Type

```bash
# Check what type the amount column currently is
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'principal_tranches' 
AND column_name = 'amount';
"
```

### Step 3: Deploy Updated Migration

After you've deployed the updated migration file, run:

```bash
# Apply all pending migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

The updated migration will:
- Skip conversion if the column is already numeric
- Only convert if it's TEXT

### Alternative: Manual Fix

If you want to fix it manually without waiting for deployment:

```bash
# Check if column is already numeric
docker compose exec postgres psql -U postgres -d nest -c "
SELECT data_type 
FROM information_schema.columns 
WHERE table_name = 'principal_tranches' 
AND column_name = 'amount';
"
```

If it's already `double precision`:
```bash
# Mark migration as applied (it's already done)
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112160000_update_principal_tranche_amount_to_numeric

# Apply remaining migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

If it's still `text`:
```bash
# The updated migration will handle it on next deploy
# For now, mark as rolled back and it will retry
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112160000_update_principal_tranche_amount_to_numeric
```

## After Fixing

Once the migration is resolved, all remaining migrations (including the `firstDisbursement` fix) will be applied automatically.
