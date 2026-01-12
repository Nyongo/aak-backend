#!/bin/bash

# Script to resolve the failed migration on remote server
# Run this on your remote server

echo "🔧 Resolving failed migration: 20260112153158_update_loan_fields_to_numeric"
echo ""

# Step 1: Mark the failed migration as rolled back
echo "Step 1: Marking migration as rolled back..."
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric

if [ $? -eq 0 ]; then
  echo "✅ Migration marked as rolled back"
else
  echo "❌ Failed to mark migration as rolled back"
  exit 1
fi

echo ""
echo "Step 2: Checking migration status..."
docker compose exec nestjs_app npx prisma migrate status

echo ""
echo "Step 3: Attempting to apply migrations..."
docker compose exec nestjs_app npx prisma migrate deploy

echo ""
echo "✅ Done! Check the output above for any errors."
