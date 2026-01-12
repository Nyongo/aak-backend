# Resolve Failed Migration on Remote Server

## Problem
The migration `20260112153158_update_loan_fields_to_numeric` failed and is blocking all new migrations from being applied.

## Solution Options

### Option 1: Mark as Rolled Back and Reapply (Recommended)

Run these commands on your **remote server**:

```bash
# Navigate to your app directory
cd /applications/aak-backend  # or wherever your app is

# Step 1: Mark the failed migration as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric

# Step 2: Check migration status
docker compose exec nestjs_app npx prisma migrate status

# Step 3: Apply all pending migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

### Option 2: Check Database State First

Before resolving, check if the migration actually completed (columns might already be converted):

```bash
# Check if columns are already numeric
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND column_name IN ('principalAmount', 'numberOfMonths', 'outstandingPrincipalBalance', 'daysLate', 'hasFemaleDirector', 'outstandingInterestBalance')
ORDER BY column_name;
"
```

**If columns are already numeric** (showing `double precision` or `integer`):
```bash
# Mark as applied (migration already completed)
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112153158_update_loan_fields_to_numeric

# Then apply remaining migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

**If columns are still TEXT**:
```bash
# Mark as rolled back and reapply
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric
docker compose exec nestjs_app npx prisma migrate deploy
```

### Option 3: Clean Up and Use db push (If migration keeps failing)

If the migration keeps failing, you can sync the schema directly:

```bash
# Step 1: Clean up any temp columns if they exist
docker compose exec postgres psql -U postgres -d nest -c "
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"principalAmount_temp\";
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"numberOfMonths_temp\";
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"outstandingPrincipalBalance_temp\";
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"daysLate_temp\";
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"hasFemaleDirector_temp\";
ALTER TABLE \"Loan\" DROP COLUMN IF EXISTS \"outstandingInterestBalance_temp\";
"

# Step 2: Mark failed migration as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric

# Step 3: Sync schema directly (this will apply all changes)
docker compose exec nestjs_app npx prisma db push --accept-data-loss

# Step 4: Mark all pending migrations as applied
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112153158_update_loan_fields_to_numeric
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112160000_update_principal_tranche_amount_to_numeric
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112192307_update_impact_survey_fields_to_numeric
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112193000_update_direct_payment_schedule_fields
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112203401_convert_first_disbursement_to_string

# Step 5: Verify
docker compose exec nestjs_app npx prisma migrate status
```

## Quick Fix Script

I've created a script `resolve-failed-migration.sh` that you can run:

```bash
# Copy the script to your server, then:
chmod +x resolve-failed-migration.sh
./resolve-failed-migration.sh
```

Or run the commands directly in the container:

```bash
docker compose exec nestjs_app sh -c "
  npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric && \
  npx prisma migrate deploy
"
```

## After Resolving

Once the failed migration is resolved, all pending migrations (including the `firstDisbursement` fix) will be applied automatically.

Verify everything is working:

```bash
# Check migration status
docker compose exec nestjs_app npx prisma migrate status

# Check firstDisbursement column type
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND column_name = 'firstDisbursement';
"
```

The `firstDisbursement` column should be `text` type.
