#!/bin/sh
set -e

echo "Starting production application..."

echo "Running database migrations..."
npx prisma migrate deploy

echo "Migrations complete. Starting NestJS application..."
exec node dist/src/main
