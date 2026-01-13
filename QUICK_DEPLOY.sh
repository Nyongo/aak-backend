#!/bin/bash

# QUICK DEPLOYMENT SCRIPT
# This script will deploy the boolean fix to your DigitalOcean server
#
# Usage: ./QUICK_DEPLOY.sh
# Or customize the variables below and run it

set -e

# ==========================================
# CONFIGURATION - UPDATE THESE VALUES
# ==========================================
SERVER_IP="161.35.105.65"
SERVER_USER="root"
APP_DIR="/applications/aak-backend"
CONTAINER_NAME="nestjs_app"  # or use docker compose service name

# ==========================================
# SCRIPT START
# ==========================================

echo "=========================================="
echo "🚀 JF BACKEND DEPLOYMENT SCRIPT"
echo "=========================================="
echo ""
echo "Server: $SERVER_USER@$SERVER_IP"
echo "App Directory: $APP_DIR"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run command on server
run_remote() {
    ssh "$SERVER_USER@$SERVER_IP" "$1"
}

# Step 1: Pull latest code
echo -e "${BLUE}[1/7]${NC} Pulling latest code from Git..."
run_remote "cd $APP_DIR && git pull origin main"
echo -e "${GREEN}✓ Code updated${NC}\n"

# Step 2: Show what changed
echo -e "${BLUE}[2/7]${NC} Recent changes:"
run_remote "cd $APP_DIR && git log --oneline -n 3"
echo ""

# Step 3: Stop containers
echo -e "${BLUE}[3/7]${NC} Stopping containers..."
run_remote "cd $APP_DIR && docker compose down" || echo "Container already stopped"
echo -e "${GREEN}✓ Containers stopped${NC}\n"

# Step 4: Build (with no cache to ensure fresh compile)
echo -e "${BLUE}[4/7]${NC} Building Docker image (this may take 2-5 minutes)..."
echo -e "${YELLOW}⚠️  Using --no-cache to ensure TypeScript is recompiled${NC}"
run_remote "cd $APP_DIR && docker compose build --no-cache"
echo -e "${GREEN}✓ Build complete${NC}\n"

# Step 5: Start containers
echo -e "${BLUE}[5/7]${NC} Starting containers..."
run_remote "cd $APP_DIR && docker compose up -d"
echo -e "${GREEN}✓ Containers started${NC}\n"

# Step 6: Wait for startup
echo -e "${BLUE}[6/7]${NC} Waiting 30 seconds for container to initialize..."
sleep 30
echo -e "${GREEN}✓ Initialization complete${NC}\n"

# Step 7: Verify the fix
echo -e "${BLUE}[7/7]${NC} Verifying fix is deployed..."

# Get container ID
CONTAINER_ID=$(run_remote "cd $APP_DIR && docker compose ps -q api" || run_remote "cd $APP_DIR && docker compose ps -q app" || run_remote "cd $APP_DIR && docker compose ps -q | head -n1")

if [ -z "$CONTAINER_ID" ]; then
    echo -e "${RED}✗ Could not find running container${NC}"
    echo "Showing all containers:"
    run_remote "docker ps"
    exit 1
fi

# Check if boolean fix is in compiled code
if run_remote "docker exec $CONTAINER_ID grep -q 'booleanFields' /app/dist/src/jf/services/loans.service.js 2>/dev/null"; then
    echo -e "${GREEN}✓ Boolean fix found in compiled code${NC}"
else
    echo -e "${RED}✗ Boolean fix NOT found in compiled code${NC}"
    echo "This might be a compilation issue. Checking file..."
    run_remote "docker exec $CONTAINER_ID ls -lh /app/dist/src/jf/services/ | grep loans"
    exit 1
fi

# Check logs for any immediate errors
echo ""
echo -e "${BLUE}Recent logs (last 20 lines):${NC}"
run_remote "cd $APP_DIR && docker compose logs --tail 20"

echo ""
echo "=========================================="
echo -e "${GREEN}✨ DEPLOYMENT COMPLETE!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Test migration status:"
echo "   curl -X GET https://your-api.com/jf/loans-migration/status"
echo ""
echo "2. Test import (this should now work!):"
echo "   curl -X POST https://your-api.com/jf/loans-migration/import-from-sheets"
echo ""
echo "3. Monitor logs:"
echo "   ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose logs -f'"
echo ""
echo "4. Check for errors:"
echo "   ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose logs | grep -i error | tail -n 20'"
echo ""
echo -e "${YELLOW}Expected Result:${NC}"
echo '  {
    "success": true,
    "imported": 1277,
    "skipped": 0,
    "errors": 0
  }'
echo ""
