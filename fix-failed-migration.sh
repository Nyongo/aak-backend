#!/bin/bash

# Script to fix failed migration on remote server
# Run this on the remote server

set -e

echo "🔍 Checking migration status..."
docker compose exec nestjs_app npx prisma migrate status

echo ""
echo "🔍 Checking if migration partially applied (checking for temp columns)..."
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND column_name LIKE '%_temp%'
ORDER BY column_name;
" || echo "Could not check temp columns"

echo ""
echo "📋 Options to fix:"
echo ""
echo "Option 1: If migration partially applied (temp columns exist), clean up and mark as rolled back:"
echo "  docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric"
echo ""
echo "Option 2: If migration fully failed (no temp columns), mark as rolled back:"
echo "  docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric"
echo ""
echo "Option 3: If database is already in correct state, mark as applied (USE WITH CAUTION):"
echo "  docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112153158_update_loan_fields_to_numeric"
echo ""
echo "After resolving, run:"
echo "  docker compose exec nestjs_app npx prisma migrate deploy"
