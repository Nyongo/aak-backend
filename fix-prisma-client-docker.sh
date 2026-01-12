#!/bin/bash

# Complete fix for Prisma client sync issue in Docker
# This script rebuilds the Docker image with updated code and regenerated Prisma client

set -e

echo "🔧 Fixing Prisma Client Sync Issue in Docker..."
echo ""

# Step 1: Pull latest code
echo "📥 Step 1: Pulling latest code..."
cd /applications/aak-backend
git pull origin main || echo "⚠️  Warning: Git pull failed (may be up to date)"

# Step 2: Rebuild Docker image (this regenerates Prisma client and builds new code)
echo ""
echo "🔨 Step 2: Rebuilding Docker image (this will regenerate Prisma client)..."
docker compose build nestjs_app

# Step 3: Stop and recreate container
echo ""
echo "🔄 Step 3: Restarting container with new image..."
docker compose up -d --force-recreate nestjs_app

# Step 4: Wait for container to start
echo ""
echo "⏳ Step 4: Waiting for container to start..."
sleep 10

# Step 5: Verify Prisma client generation
echo ""
echo "✅ Step 5: Verifying Prisma client..."
docker compose exec nestjs_app npx prisma generate

# Step 6: Check Prisma client version
echo ""
echo "📊 Step 6: Checking Prisma status..."
docker compose exec nestjs_app npx prisma --version
docker compose exec nestjs_app npx prisma migrate status

# Step 7: Verify container is running
echo ""
echo "🔍 Step 7: Checking container status..."
docker compose ps

echo ""
echo "🎉 Fix complete!"
echo ""
echo "Next steps:"
echo "1. Test import: curl -X POST http://localhost:3000/jf/loans-migration/import-from-sheets"
echo "2. Check logs: docker compose logs nestjs_app --tail 100"
echo "3. Watch logs: docker compose logs -f nestjs_app"
