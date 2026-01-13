#!/bin/bash

# Test Import with Detailed Logging
# This script tests the import and shows debug logs

SERVER="161.35.105.65"
USER="root"
APP_DIR="/applications/aak-backend"
API_URL="${1:-https://your-api-url.com}"

echo "🧪 Testing Loan Import with Debug Logging"
echo "=========================================="
echo ""

# Step 1: Clear recent logs
echo "1️⃣ Clearing recent logs..."
ssh ${USER}@${SERVER} "cd ${APP_DIR} && docker compose logs --tail 0 -f > /dev/null 2>&1 &"
sleep 2

# Step 2: Trigger import
echo ""
echo "2️⃣ Triggering import..."
echo "   API URL: ${API_URL}/jf/loans-migration/import-from-sheets"
echo ""

# Note: Add your authorization header if needed
RESPONSE=$(curl -s -X POST "${API_URL}/jf/loans-migration/import-from-sheets" \
  -H "Content-Type: application/json")

echo "📊 Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Step 3: Check logs for debug output
echo ""
echo "3️⃣ Checking logs for DEBUG synced messages..."
ssh ${USER}@${SERVER} "cd ${APP_DIR} && docker compose logs --tail 100 | grep -i 'DEBUG synced' | head -n 5"

# Step 4: Check for parameter 57 errors
echo ""
echo "4️⃣ Checking for parameter 57 errors..."
HAS_ERROR=$(ssh ${USER}@${SERVER} "cd ${APP_DIR} && docker compose logs --tail 100 | grep -c 'parameter 57'")

if [ "$HAS_ERROR" -gt 0 ]; then
    echo "   ❌ Found $HAS_ERROR parameter 57 errors"
    echo ""
    echo "   Recent error:"
    ssh ${USER}@${SERVER} "cd ${APP_DIR} && docker compose logs --tail 100 | grep -A 3 'parameter 57' | tail -n 10"
else
    echo "   ✅ No parameter 57 errors found"
fi

echo ""
echo "5️⃣ Check full error details..."
ssh ${USER}@${SERVER} "cd ${APP_DIR} && docker compose logs --tail 50 | grep -i error | tail -n 10"

echo ""
echo "=========================================="
echo "Test complete!"
