#!/bin/bash

echo "🔧 Fixing Prisma Client Sync Issue..."

# Step 1: Regenerate Prisma client in the container
echo "📦 Regenerating Prisma client..."
docker compose exec nestjs_app npx prisma generate

# Step 2: Restart container to use new client
echo "🔄 Restarting container..."
docker compose restart nestjs_app

# Step 3: Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Step 4: Verify Prisma client
echo "✅ Verifying Prisma client..."
docker compose exec nestjs_app npx prisma --version

echo ""
echo "⚠️  Note: This is a temporary fix."
echo "   For a permanent fix, rebuild the Docker image:"
echo "   docker compose build nestjs_app"
echo "   docker compose up -d --force-recreate nestjs_app"
