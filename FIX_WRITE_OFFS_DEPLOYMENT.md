# Fix WriteOffs Migration Controller 404 Error

## Problem
Getting 404 error: `Cannot GET /jf/write-offs-migration/status`

## Root Causes
1. New files not committed/pushed to git
2. Prisma client not regenerated in Docker container
3. Database table doesn't exist on remote server
4. Application not restarted after changes

## Solution

### Step 1: Commit and Push New Files

```bash
# Check what files need to be committed
git status

# Add all new WriteOffs files
git add src/jf/services/write-offs-db.service.ts
git add src/jf/controllers/write-offs-migration.controller.ts
git add src/jf/dto/create-write-off.dto.ts
git add src/jf/dto/update-write-off.dto.ts
git add prisma/schema.prisma
git add src/jf/jf.module.ts
git add src/jf/services/sheets.service.ts

# Commit
git commit -m "Add WriteOffs migration controller and model"

# Push to remote
git push origin main
```

### Step 2: Deploy to Remote Server

SSH into your server and run:

```bash
cd /applications/aak-backend

# Pull latest code
git pull origin main

# Rebuild Docker image (this will compile TypeScript and regenerate Prisma client)
docker compose build --no-cache nestjs_app

# Restart container
docker compose up -d --force-recreate nestjs_app

# Wait for container to start
sleep 15

# Create the database table (if it doesn't exist)
docker compose exec nestjs_app npx prisma db push --accept-data-loss

# Regenerate Prisma client in container
docker compose exec nestjs_app npx prisma generate

# Restart again to pick up new Prisma client
docker compose restart nestjs_app

# Check logs
docker compose logs nestjs_app --tail 50
```

### Step 3: Verify Deployment

```bash
# Check if controller is registered
docker compose exec nestjs_app grep -r "write-offs-migration" /app/dist/src/jf/controllers/ || echo "Controller not found in compiled code"

# Check if Prisma client has WriteOff model
docker compose exec nestjs_app node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); console.log('WriteOff model exists:', !!p.writeOff);"

# Test the endpoint
curl -X GET http://localhost:3000/jf/write-offs-migration/status
```

### Step 4: If Still Not Working

Check the following:

1. **Verify files exist in container:**
```bash
docker compose exec nestjs_app ls -la /app/dist/src/jf/controllers/ | grep write-off
docker compose exec nestjs_app ls -la /app/src/jf/controllers/ | grep write-off
```

2. **Check application logs for errors:**
```bash
docker compose logs nestjs_app | grep -i "error\|writeoff\|write-off" | tail -20
```

3. **Verify module registration:**
```bash
docker compose exec nestjs_app grep -r "WriteOffsMigrationController" /app/dist/src/jf/jf.module.js
```

4. **Check if table exists:**
```bash
docker compose exec postgres psql -U postgres -d nest -c "\d write_offs"
```

## Quick Fix Script

Create a file `fix-write-offs-deploy.sh` on your server:

```bash
#!/bin/bash
set -e

cd /applications/aak-backend

echo "📥 Pulling latest code..."
git pull origin main

echo "🔨 Building Docker image..."
docker compose build --no-cache nestjs_app

echo "🔄 Restarting container..."
docker compose up -d --force-recreate nestjs_app

echo "⏳ Waiting for container..."
sleep 15

echo "📊 Creating database table..."
docker compose exec nestjs_app npx prisma db push --accept-data-loss || echo "Table may already exist"

echo "🔧 Regenerating Prisma client..."
docker compose exec nestjs_app npx prisma generate

echo "🔄 Restarting again..."
docker compose restart nestjs_app

echo "✅ Done! Testing endpoint..."
sleep 5
curl -X GET http://localhost:3000/jf/write-offs-migration/status || echo "Endpoint test failed - check logs"
```

Make it executable and run:
```bash
chmod +x fix-write-offs-deploy.sh
./fix-write-offs-deploy.sh
```
