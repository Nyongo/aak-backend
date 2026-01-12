# Quick Fix for Failed Migration on Remote Server

## Problem
The container exits immediately because migration `20260112153158_update_loan_fields_to_numeric` failed.

## Solution 1: Mark as Rolled Back and Reapply (Recommended)

SSH into your remote server and run:

```bash
# Navigate to your app directory
cd /applications/aak-backend  # or wherever your app is

# Mark the failed migration as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric

# Reapply all migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

## Solution 2: Check Database State First

If you want to verify the database state before fixing:

```bash
# Check if columns are already converted
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND column_name IN ('principalAmount', 'numberOfMonths', 'outstandingPrincipalBalance', 'daysLate', 'hasFemaleDirector', 'outstandingInterestBalance')
ORDER BY column_name;
"

# If columns are already correct (showing numeric types), mark as applied:
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112153158_update_loan_fields_to_numeric

# Then run remaining migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

## Solution 3: Clean Up and Use db push (If migration is too complex)

```bash
# Clean up any temp columns if they exist
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

# Sync schema directly
docker compose exec nestjs_app npx prisma db push --accept-data-loss

# Mark all pending migrations as applied
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112153158_update_loan_fields_to_numeric
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112160000_update_principal_tranche_amount_to_numeric
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112192307_update_impact_survey_fields_to_numeric
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112193000_update_direct_payment_schedule_fields
```

## After Fixing

Once migrations are resolved, the app should start normally. The new startup script will:
- Attempt to run migrations on startup
- Continue starting the app even if migrations fail (with warnings)
- Allow you to fix migrations manually without blocking the app

## Verify App is Running

```bash
# Check container status
docker compose ps

# Check logs
docker compose logs nestjs_app

# Check migration status
docker compose exec nestjs_app npx prisma migrate status
```
