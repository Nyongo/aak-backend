#!/bin/bash
# Don't exit on error for backup step
set -e

echo "🚀 Starting Loan firstDisbursement fix deployment..."

# Step 1: Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Step 2: Backup (optional - you mentioned you'll manually truncate)
echo "💾 Creating backup (optional)..."
mkdir -p backups

# Temporarily disable exit on error for backup
set +e
# Try to backup with quoted table name (case-sensitive in PostgreSQL)
docker compose exec -T postgres pg_dump -U postgres -d nest -t '"Loan"' --data-only > backups/loan_backup_$(date +%Y%m%d_%H%M%S).sql 2>&1
BACKUP_EXIT_CODE=$?
set -e

if [ $BACKUP_EXIT_CODE -eq 0 ]; then
  echo "✅ Backup created successfully"
else
  echo "⚠️  Backup skipped (table may not exist or will be truncated manually)"
  echo "   Continuing with deployment..."
fi

# Step 3: Build image
echo "🔨 Building Docker image..."
docker compose build nestjs_app

# Step 4: Restart container
echo "🔄 Restarting container..."
docker compose up -d --force-recreate nestjs_app

# Step 5: Wait for container
echo "⏳ Waiting for container to start..."
sleep 10

# Step 6: Apply migration
echo "📊 Applying migration..."
docker compose exec nestjs_app npx prisma migrate deploy

# Step 7: Verify
echo "✅ Verifying fix..."
echo ""
echo "Column type:"
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Loan' 
AND column_name = 'firstDisbursement';
"

echo ""
echo "Sample data:"
docker compose exec postgres psql -U postgres -d nest -c "
SELECT \"sheetId\", \"firstDisbursement\" 
FROM \"Loan\" 
WHERE \"firstDisbursement\" IS NOT NULL 
LIMIT 3;
"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test Loan import: curl -X POST http://localhost:3000/jf/loans-migration/import-from-sheets"
echo "2. Check logs: docker compose logs nestjs_app --tail 50"
echo "3. Verify no errors in application"
