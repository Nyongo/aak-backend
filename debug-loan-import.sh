#!/bin/bash

echo "🔍 Debugging Loan Import Issue..."
echo ""

# Step 1: Check Prisma client version
echo "1. Checking Prisma client..."
docker compose exec nestjs_app npx prisma --version

# Step 2: Check if Prisma client needs regeneration
echo ""
echo "2. Checking Prisma client generation..."
docker compose exec nestjs_app sh -c "ls -la node_modules/.prisma/client/ | head -5"

# Step 3: Regenerate Prisma client
echo ""
echo "3. Regenerating Prisma client..."
docker compose exec nestjs_app npx prisma generate

# Step 4: Check database schema vs Prisma schema
echo ""
echo "4. Checking database column types..."
docker compose exec postgres psql -U postgres -d nest -c "
SELECT 
  column_name, 
  data_type,
  ordinal_position
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND data_type IN ('double precision', 'integer', 'timestamp without time zone', 'text')
ORDER BY ordinal_position;
" | grep -E "(column_name|principalAmount|outstandingPrincipalBalance|numberOfMonths|daysLate|hasFemaleDirector|outstandingInterestBalance|firstDisbursement)"

# Step 5: Check a sample record to see data types
echo ""
echo "5. Sample record (first 10 fields)..."
docker compose exec postgres psql -U postgres -d nest -c "
SELECT 
  \"sheetId\",
  \"principalAmount\",
  \"outstandingPrincipalBalance\",
  \"numberOfMonths\",
  \"daysLate\",
  \"hasFemaleDirector\",
  \"outstandingInterestBalance\",
  \"firstDisbursement\"
FROM \"Loan\" 
LIMIT 1;
"

echo ""
echo "✅ Debug complete!"
echo ""
echo "Next steps:"
echo "1. If Prisma client was regenerated, restart container: docker compose restart nestjs_app"
echo "2. If code needs updating, rebuild image: docker compose build nestjs_app"
echo "3. Check application logs: docker compose logs nestjs_app --tail 100"
