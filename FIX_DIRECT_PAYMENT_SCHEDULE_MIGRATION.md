# Fix Direct Payment Schedule Migration Error

## Problem
The migration `20260112193000_update_direct_payment_schedule_fields` is failing with:
```
ERROR: function pg_catalog.btrim(numeric) does not exist
```

This happens because the `amountDue` and `amountPaid` columns are already numeric (not TEXT), but the migration tries to use `TRIM()` which only works on text types.

## Solution
The migration has been updated to:
1. Check the column type first for each field
2. If TEXT: convert to the target type
3. If already the correct type: skip conversion
4. If wrong type: cast to the correct type

## Steps to Fix on Remote Server

### Step 1: Mark the Failed Migration as Rolled Back

```bash
# Navigate to your app directory
cd /applications/aak-backend

# Mark the failed migration as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112193000_update_direct_payment_schedule_fields
```

### Step 2: Check Current Column Types

```bash
# Check what types the columns currently are
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'DirectPaymentSchedule' 
AND column_name IN ('amountDue', 'amountPaid', 'dueDate', 'daysLate')
ORDER BY column_name;
"
```

### Step 3: Deploy Updated Migration

After you've deployed the updated migration file, run:

```bash
# Apply all pending migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

The updated migration will:
- Skip conversion if columns are already the correct type
- Only convert if they're TEXT or wrong type

### Alternative: Manual Fix

If you want to fix it manually without waiting for deployment:

```bash
# Check if columns are already correct types
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'DirectPaymentSchedule' 
AND column_name IN ('amountDue', 'amountPaid', 'dueDate', 'daysLate');
"
```

If they're already correct:
```bash
# Mark migration as applied (it's already done)
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112193000_update_direct_payment_schedule_fields

# Apply remaining migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

## After Fixing

Once this migration is resolved, the remaining migration (`20260112203401_convert_first_disbursement_to_string`) should apply automatically.
