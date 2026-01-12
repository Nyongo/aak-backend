#!/bin/sh
set -e

echo "🚀 Starting application..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  >&2 echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "✅ PostgreSQL is ready"

# Run Prisma migrations
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

echo "✅ Migrations completed"

# Start the application
echo "🚀 Starting NestJS application..."
exec "$@"
