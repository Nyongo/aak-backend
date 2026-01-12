#!/bin/bash

# Emergency Deployment Script - Fix Boolean Type Error
# Usage: ./deploy-fix.sh [server-ip] [user]

set -e  # Exit on any error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER_IP=${1:-"your-server-ip"}
USER=${2:-"root"}
APP_DIR="/var/www/jf-backend"  # Adjust this path

echo -e "${YELLOW}🚀 Starting Emergency Deployment${NC}"
echo "Server: $USER@$SERVER_IP"
echo "App Directory: $APP_DIR"
echo ""

# Step 1: Check if we can connect
echo -e "${YELLOW}Step 1: Testing SSH connection...${NC}"
if ssh -o ConnectTimeout=5 "$USER@$SERVER_IP" "echo 'Connected successfully'"; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}✗ SSH connection failed${NC}"
    exit 1
fi

# Step 2: Pull latest code
echo -e "${YELLOW}Step 2: Pulling latest code on server...${NC}"
ssh "$USER@$SERVER_IP" "cd $APP_DIR && git pull origin main" || {
    echo -e "${RED}✗ Git pull failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Code updated${NC}"

# Step 3: Rebuild Docker container
echo -e "${YELLOW}Step 3: Rebuilding Docker container...${NC}"
ssh "$USER@$SERVER_IP" "cd $APP_DIR && docker-compose down" || {
    echo -e "${YELLOW}⚠ Warning: docker-compose down had issues, continuing...${NC}"
}

echo -e "${YELLOW}Building with --no-cache to ensure clean build...${NC}"
ssh "$USER@$SERVER_IP" "cd $APP_DIR && docker-compose build --no-cache" || {
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Container built${NC}"

# Step 4: Start container
echo -e "${YELLOW}Step 4: Starting container...${NC}"
ssh "$USER@$SERVER_IP" "cd $APP_DIR && docker-compose up -d" || {
    echo -e "${RED}✗ Container start failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Container started${NC}"

# Step 5: Wait for container to be ready
echo -e "${YELLOW}Step 5: Waiting for container to be ready (30 seconds)...${NC}"
sleep 30

# Step 6: Verify the fix is in place
echo -e "${YELLOW}Step 6: Verifying fix is compiled...${NC}"
CONTAINER_NAME=$(ssh "$USER@$SERVER_IP" "cd $APP_DIR && docker-compose ps -q | head -n1")

if ssh "$USER@$SERVER_IP" "docker exec $CONTAINER_NAME grep -q 'booleanFields' /app/dist/src/jf/services/loans.service.js"; then
    echo -e "${GREEN}✓ Boolean handling fix found in compiled code${NC}"
else
    echo -e "${RED}✗ Boolean handling NOT found in compiled code${NC}"
    echo -e "${YELLOW}Showing compiled service code (first 200 lines):${NC}"
    ssh "$USER@$SERVER_IP" "docker exec $CONTAINER_NAME head -n 200 /app/dist/src/jf/services/loans.service.js"
    exit 1
fi

# Step 7: Check logs for errors
echo -e "${YELLOW}Step 7: Checking recent logs...${NC}"
ssh "$USER@$SERVER_IP" "cd $APP_DIR && docker-compose logs --tail 50" | head -n 30

echo ""
echo -e "${GREEN}✨ Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test the migration endpoint:"
echo "   curl -X POST https://your-api.com/jf/loans-migration/import-from-sheets"
echo ""
echo "2. Monitor logs in real-time:"
echo "   ssh $USER@$SERVER_IP 'cd $APP_DIR && docker-compose logs -f'"
echo ""
echo "3. Check for parameter 57 errors:"
echo "   ssh $USER@$SERVER_IP 'cd $APP_DIR && docker-compose logs | grep -i \"parameter 57\"'"
