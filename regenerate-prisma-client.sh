#!/bin/bash

echo "🔧 Regenerating Prisma Client in Docker Container..."

# Step 1: Regenerate Prisma client
echo "📦 Regenerating Prisma client..."
docker compose exec nestjs_app npx prisma generate

# Step 2: Verify generation
echo "✅ Verifying Prisma client..."
docker compose exec nestjs_app npx prisma --version

echo ""
echo "🔄 Restarting container to use new client..."
docker compose restart nestjs_app

echo ""
echo "⏳ Waiting for container to start..."
sleep 10

echo ""
echo "✅ Prisma client regenerated!"
echo ""
echo "⚠️  Note: This is a temporary fix."
echo "   For a permanent fix, rebuild the Docker image:"
echo "   docker compose build nestjs_app"
echo "   docker compose up -d --force-recreate nestjs_app"
