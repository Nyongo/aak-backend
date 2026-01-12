#!/bin/sh

# Production startup script with resilient migration handling
# This script attempts to run migrations but won't prevent the app from starting if they fail

echo "🔄 Attempting to run database migrations..."

# Try to run migrations, but don't fail if they error
npx prisma migrate deploy || {
  echo "⚠️  WARNING: Database migrations failed or are pending resolution."
  echo "⚠️  The application will start, but you should resolve migration issues manually."
  echo "⚠️  Run: docker compose exec nestjs_app npx prisma migrate status"
  echo "⚠️  Or: docker compose exec nestjs_app npx prisma migrate resolve --rolled-back <migration_name>"
}

echo "🚀 Starting NestJS application..."
node dist/src/main
