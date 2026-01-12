#!/bin/bash

# Script to run Prisma migrations in Docker container
# Usage: ./run-migrations.sh

set -e

echo "🔄 Running Prisma migrations in Docker container..."

# Check if container is running
if ! docker compose ps | grep -q "nestjs_app.*Up"; then
    echo "❌ Error: nestjs_app container is not running"
    echo "Please start the containers first with: docker compose up -d"
    exit 1
fi

# Run migrations
echo "⏳ Executing migrations..."
docker compose exec nestjs_app npx prisma migrate deploy

echo "✅ Migrations completed successfully!"
