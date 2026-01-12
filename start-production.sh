#!/bin/sh

# Production startup script with resilient migration handling
echo "🚀 Starting production application..."

# Ensure Prisma client is generated
echo "🔄 Generating Prisma client..."
npx prisma generate || {
  echo "⚠️  WARNING: Prisma client generation failed. Continuing anyway..."
}

# Try to run migrations, but don't fail if they error
echo "🔄 Attempting to run database migrations..."
npx prisma migrate deploy || {
  echo "⚠️  WARNING: Database migrations failed or are pending resolution."
  echo "⚠️  The application will start, but you should resolve migration issues manually."
  echo "⚠️  Run: docker compose exec nestjs_app npx prisma migrate status"
  echo "⚠️  Or: docker compose exec nestjs_app npx prisma migrate resolve --rolled-back <migration_name>"
}

# Start the application with error handling
echo "🚀 Starting NestJS application..."
if ! node dist/src/main; then
  echo "❌ Application failed to start. Exit code: $?"
  echo "📋 Checking for common issues..."
  echo "   - Prisma client: $(test -d node_modules/.prisma && echo '✅ Found' || echo '❌ Missing')"
  echo "   - Built app: $(test -d dist && echo '✅ Found' || echo '❌ Missing')"
  echo "   - SSL certs: $(test -f ssl/server.key && echo '✅ Found' || echo '❌ Missing')"
  exit 1
fi
