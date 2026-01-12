#!/bin/bash

# Diagnostic script to check container state
# Run this on the remote server: docker compose exec nestjs_app sh diagnose-container.sh

echo "=== Container Diagnostics ==="
echo ""

echo "1. Checking Prisma client..."
if [ -d "node_modules/.prisma" ]; then
  echo "   ✅ Prisma client directory exists"
else
  echo "   ❌ Prisma client directory missing"
fi

echo ""
echo "2. Checking built application..."
if [ -d "dist" ]; then
  echo "   ✅ dist directory exists"
  if [ -f "dist/src/main.js" ]; then
    echo "   ✅ main.js exists"
  else
    echo "   ❌ main.js missing"
  fi
else
  echo "   ❌ dist directory missing"
fi

echo ""
echo "3. Checking SSL certificates..."
if [ -f "ssl/server.key" ]; then
  echo "   ✅ server.key exists"
else
  echo "   ❌ server.key missing"
fi

if [ -f "ssl/server.cert" ]; then
  echo "   ✅ server.cert exists"
else
  echo "   ❌ server.cert missing"
fi

echo ""
echo "4. Checking Prisma schema..."
if [ -f "prisma/schema.prisma" ]; then
  echo "   ✅ schema.prisma exists"
else
  echo "   ❌ schema.prisma missing"
fi

echo ""
echo "5. Checking environment variables..."
if [ -f ".env" ]; then
  echo "   ✅ .env file exists"
  if grep -q "DATABASE_URL" .env; then
    echo "   ✅ DATABASE_URL is set"
  else
    echo "   ❌ DATABASE_URL not found in .env"
  fi
else
  echo "   ❌ .env file missing"
fi

echo ""
echo "6. Testing Prisma connection..."
npx prisma db execute --stdin <<< "SELECT 1" 2>&1 | head -5

echo ""
echo "7. Checking migration status..."
npx prisma migrate status 2>&1 | head -10

echo ""
echo "=== End Diagnostics ==="
