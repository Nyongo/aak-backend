x# Complete Deployment Guide: Loan firstDisbursement Fix

## Overview

This guide covers the complete deployment process for fixing the `firstDisbursement` field in the Loan model, including Docker image build and migration application.

## Migration Details

- **Migration**: `20260112203401_convert_first_disbursement_to_string`
- **Purpose**: Converts `firstDisbursement` from TIMESTAMP to TEXT (DD/MM/YYYY format)
- **Table**: `Loan`
- **Field**: `firstDisbursement`

---

## Step 1: Local Preparation (On Your Development Machine)

### 1.1 Verify Changes Are Committed

```bash
# Check git status
git status

# Ensure all changes are committed
git add .
git commit -m "Fix: Convert Loan firstDisbursement to TEXT (DD/MM/YYYY format)"
git push origin main  # or your branch name
```

### 1.2 Verify Migration File Exists

```bash
# Check migration file exists
ls -la prisma/migrations/20260112203401_convert_first_disbursement_to_string/migration.sql

# Verify migration content
cat prisma/migrations/20260112203401_convert_first_disbursement_to_string/migration.sql
```

### 1.3 (Optional) Test Build Locally

```bash
# Build Docker image locally to verify it works
docker compose build nestjs_app

# Check if build succeeded
docker images | grep nestjs_app
```

---

## Step 2: Deploy to Remote Server

### 2.1 SSH into Remote Server

```bash
ssh root@your-server-ip
# or
ssh user@your-server-ip
```

### 2.2 Navigate to Application Directory

```bash
cd /applications/aak-backend
# or wherever your application is located
```

### 2.3 Pull Latest Code

```bash
# Pull latest changes from git
git pull origin main

# Verify the migration file is present
ls -la prisma/migrations/20260112203401_convert_first_disbursement_to_string/migration.sql
```

---

## Step 3: Backup Database (Recommended)

### 3.1 Backup Loan Table

```bash
# Create backup directory if it doesn't exist
mkdir -p backups

# Backup the Loan table
docker compose exec postgres pg_dump -U postgres -d nest -t "Loan" --data-only > backups/loan_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh backups/loan_backup_*.sql
```

### 3.2 (Optional) Backup Entire Database

```bash
# Full database backup
docker compose exec postgres pg_dump -U postgres -d nest > backups/full_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Step 4: Check Current Database State

### 4.1 Check Column Type

```bash
# Check current column type
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Loan'
AND column_name = 'firstDisbursement';
"
```

**Expected Output:**

- If `data_type = 'timestamp without time zone'` → Migration needed
- If `data_type = 'text'` → Already converted, migration will skip

### 4.2 Check Sample Data

```bash
# Check current data format
docker compose exec postgres psql -U postgres -d nest -c "
SELECT \"sheetId\", \"firstDisbursement\"
FROM \"Loan\"
WHERE \"firstDisbursement\" IS NOT NULL
LIMIT 5;
"
```

---

## Step 5: Build Docker Image

### 5.1 Stop Running Container (Optional - for zero downtime, skip this)

```bash
# Option A: Stop container (causes downtime)
docker compose stop nestjs_app

# Option B: Keep running and rebuild (recommended)
# Continue without stopping
```

### 5.2 Build New Docker Image

```bash
# Build the new image with all changes
docker compose build nestjs_app

# This will:
# - Install dependencies
# - Generate Prisma client (with updated schema)
# - Build TypeScript to JavaScript
# - Include the new migration file
```

**Expected Output:**

```
[+] Building X.Xs (XX/XX) FINISHED
...
Successfully built abc123def456
Successfully tagged aak-backend-nestjs_app:latest
```

### 5.3 Verify Image Was Built

```bash
# Check new image exists
docker images | grep nestjs_app

# Check image size and creation time
docker images aak-backend-nestjs_app
```

---

## Step 6: Apply Migration

### 6.1 Start/Restart Container with New Image

```bash
# If you stopped the container:
docker compose up -d nestjs_app

# If container is still running, restart it:
docker compose restart nestjs_app

# Or recreate it (recommended to ensure new image is used):
docker compose up -d --force-recreate nestjs_app
```

### 6.2 Wait for Container to Start

```bash
# Wait a few seconds for container to be ready
sleep 5

# Check container status
docker compose ps

# Check container logs
docker compose logs nestjs_app --tail 50
```

### 6.3 Apply Migration

```bash
# Apply the migration
docker compose exec nestjs_app npx prisma migrate deploy
```

**Expected Output:**

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "nest", schema "public" at "postgres:5432"

X migrations found in prisma/migrations

Applying migration `20260112203401_convert_first_disbursement_to_string`
```

### 6.4 Verify Migration Status

```bash
# Check migration status
docker compose exec nestjs_app npx prisma migrate status
```

---

## Step 7: Verify the Fix

### 7.1 Check Column Type

```bash
# Verify column is now TEXT
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Loan'
AND column_name = 'firstDisbursement';
"
```

**Expected Output:**

```
 column_name          | data_type
----------------------+-----------
 firstDisbursement    | text
```

### 7.2 Check Data Format

```bash
# Verify data is in DD/MM/YYYY format
docker compose exec postgres psql -U postgres -d nest -c "
SELECT \"sheetId\", \"firstDisbursement\"
FROM \"Loan\"
WHERE \"firstDisbursement\" IS NOT NULL
LIMIT 5;
"
```

**Expected Output:**

```
 sheetId  | firstDisbursement
----------+-------------------
 d8d66a87 | 13/05/2022
 93346221 | 05/05/2022
 ...
```

### 7.3 Check Container Health

```bash
# Check if container is running
docker compose ps

# Check application logs
docker compose logs nestjs_app --tail 20

# Test if API is responding
curl http://localhost:3000 || echo "API not responding"
```

---

## Step 8: Test Loan Import

### 8.1 Test Import Endpoint

```bash
# Test the import (if you have the endpoint)
curl -X POST http://localhost:3000/jf/loans-migration/import-from-sheets

# Or check via your API client/browser
# POST http://your-server-ip:3000/jf/loans-migration/import-from-sheets
```

### 8.2 Verify No Errors

```bash
# Check application logs for errors
docker compose logs nestjs_app --tail 100 | grep -i error

# Check for Prisma errors specifically
docker compose logs nestjs_app --tail 100 | grep -i "prisma\|firstDisbursement"
```

---

## Step 9: Cleanup (Optional)

### 9.1 Remove Old Docker Images

```bash
# List all images
docker images

# Remove old/unused images (be careful!)
docker image prune -a

# Or remove specific old image
docker rmi <old-image-id>
```

---

## Troubleshooting

### Issue: Migration Fails

**Error**: `migrate found failed migrations`

**Solution**:

```bash
# Check failed migrations
docker compose exec nestjs_app npx prisma migrate status

# Mark as rolled back if needed
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112203401_convert_first_disbursement_to_string

# Try again
docker compose exec nestjs_app npx prisma migrate deploy
```

### Issue: Container Won't Start

**Check logs**:

```bash
docker compose logs nestjs_app
```

**Common fixes**:

- Check database connection
- Verify environment variables
- Check if port 3000 is available

### Issue: Column Type Not Changed

**Manual fix**:

```bash
docker compose exec postgres psql -U postgres -d nest << 'EOF'
ALTER TABLE "Loan" ADD COLUMN "firstDisbursement_temp" TEXT;

UPDATE "Loan"
SET "firstDisbursement_temp" = CASE
  WHEN "firstDisbursement" IS NULL THEN NULL
  ELSE TO_CHAR("firstDisbursement"::timestamp, 'DD/MM/YYYY')
END;

ALTER TABLE "Loan" DROP COLUMN "firstDisbursement";
ALTER TABLE "Loan" RENAME COLUMN "firstDisbursement_temp" TO "firstDisbursement";
EOF

# Then mark migration as applied
docker compose exec nestjs_app npx prisma migrate resolve --applied 20260112203401_convert_first_disbursement_to_string
```

### Issue: Rollback Needed

**Restore from backup**:

```bash
# Find your backup file
ls -lh backups/loan_backup_*.sql

# Restore (WARNING: This will overwrite current data)
docker compose exec postgres psql -U postgres -d nest < backups/loan_backup_YYYYMMDD_HHMMSS.sql

# Mark migration as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112203401_convert_first_disbursement_to_string
```

---

## Quick Deployment Script

If you prefer a single script, create `deploy-loan-fix.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting Loan firstDisbursement fix deployment..."

# Step 1: Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Step 2: Backup
echo "💾 Creating backup..."
mkdir -p backups
docker compose exec postgres pg_dump -U postgres -d nest -t "Loan" --data-only > backups/loan_backup_$(date +%Y%m%d_%H%M%S).sql

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
docker compose exec postgres psql -U postgres -d nest -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Loan'
AND column_name = 'firstDisbursement';
"

echo "🎉 Deployment complete!"
```

Make it executable and run:

```bash
chmod +x deploy-loan-fix.sh
./deploy-loan-fix.sh
```

---

## Verification Checklist

After deployment, verify:

- [ ] Migration applied successfully
- [ ] Column type is `text`
- [ ] Data is in DD/MM/YYYY format
- [ ] Container is running
- [ ] Application logs show no errors
- [ ] Loan import works correctly
- [ ] API endpoints respond correctly

---

## Next Steps

After Loan is successfully fixed:

1. ✅ Test Loan imports thoroughly
2. ✅ Monitor for any issues
3. 📋 Move on to PrincipalTranche `initialDisbursementDateInContract` fix
4. 📋 Continue with other pending migrations

---

## Support

If you encounter issues:

1. Check container logs: `docker compose logs nestjs_app`
2. Check migration status: `docker compose exec nestjs_app npx prisma migrate status`
3. Check database directly: `docker compose exec postgres psql -U postgres -d nest`
4. Review backup files in `backups/` directory
