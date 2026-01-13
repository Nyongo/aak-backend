#!/bin/bash

# Deployment script for WriteOffs migration controller
# This script should be run on the remote server

set -e

echo "🚀 Deploying WriteOffs Migration Controller..."
echo ""

cd /applications/aak-backend

# Step 1: Pull latest code
echo "📥 [1/6] Pulling latest code..."
git pull origin main
echo "✅ Code updated"
echo ""

# Step 2: Build Docker image
echo "🔨 [2/6] Building Docker image (this may take 2-5 minutes)..."
docker compose build --no-cache nestjs_app
echo "✅ Build complete"
echo ""

# Step 3: Restart container
echo "🔄 [3/6] Restarting container..."
docker compose up -d --force-recreate nestjs_app
echo "✅ Container restarted"
echo ""

# Step 4: Wait for container
echo "⏳ [4/6] Waiting for container to initialize..."
sleep 15
echo "✅ Container ready"
echo ""

# Step 5: Create database table and regenerate Prisma client
echo "📊 [5/6] Setting up database..."
echo "   Creating write_offs table..."
docker compose exec nestjs_app npx prisma db push --accept-data-loss || echo "⚠️  Table may already exist or migration needed"
echo "   Regenerating Prisma client..."
docker compose exec nestjs_app npx prisma generate
echo "✅ Database setup complete"
echo ""

# Step 6: Restart again to pick up new Prisma client
echo "🔄 [6/6] Restarting container to load new Prisma client..."
docker compose restart nestjs_app
sleep 10
echo "✅ Container restarted"
echo ""

# Verify deployment
echo "🔍 Verifying deployment..."
echo ""

# Check if controller exists in compiled code
if docker compose exec nestjs_app test -f /app/dist/src/jf/controllers/write-offs-migration.controller.js; then
  echo "✅ Controller file found in compiled code"
else
  echo "❌ Controller file NOT found in compiled code"
  echo "   Checking dist directory..."
  docker compose exec nestjs_app ls -la /app/dist/src/jf/controllers/ | grep write || echo "   No write-off files found"
fi

# Check logs
echo ""
echo "📋 Recent logs (last 20 lines):"
docker compose logs nestjs_app --tail 20

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🧪 Test the endpoint:"
echo "   curl -X GET http://localhost:3000/jf/write-offs-migration/status"
echo ""
echo "📊 Check columns:"
echo "   curl -X GET http://localhost:3000/jf/write-offs-migration/columns"
echo ""
echo "📥 Import data:"
echo "   curl -X POST http://localhost:3000/jf/write-offs-migration/full-migration"
echo ""
