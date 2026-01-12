# Emergency Deployment Guide - Fix Synced Boolean Error

## Issue
Remote server error: "incorrect binary data format in bind parameter 57"
Cause: Old compiled JavaScript doesn't have the boolean handling fix

## Quick Fix Steps

### Option 1: Docker Rebuild (Recommended)

```bash
# 1. SSH into your DigitalOcean server
ssh your-user@your-server-ip

# 2. Navigate to your app directory
cd /path/to/jf-backend

# 3. Pull latest code
git pull origin main

# 4. Rebuild and restart (this will recompile TypeScript)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 5. Watch logs to verify
docker-compose logs -f
```

### Option 2: Manual Build in Container

```bash
# 1. SSH into server
ssh your-user@your-server-ip

# 2. Access the running container
docker exec -it <container-name> sh

# 3. Inside container, rebuild
npm run build

# 4. Exit and restart container
exit
docker-compose restart
```

### Option 3: Local Build + Upload (If Docker rebuild is slow)

```bash
# 1. Build locally
npm run build

# 2. Create deployment package
tar -czf dist.tar.gz dist/

# 3. Upload to server
scp dist.tar.gz your-user@your-server-ip:/path/to/jf-backend/

# 4. On server, extract and restart
ssh your-user@your-server-ip
cd /path/to/jf-backend
tar -xzf dist.tar.gz
docker-compose restart

# 5. Verify
docker-compose logs -f | grep -i "synced\|error"
```

## Verification Commands

```bash
# Check if boolean handling is in compiled code
docker exec <container> cat dist/src/jf/services/loans.service.js | grep "booleanFields"

# Should output: const booleanFields = ['synced'];

# Test the import endpoint
curl -X POST https://your-api.com/jf/loans-migration/import-from-sheets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Critical: Line Numbers Reference

The error shows line 160 in the OLD compiled code:
```
/app/dist/src/jf/services/loans.service.js:160:55
```

After the fix, the boolean handling should be at approximately line 78-97 in the TypeScript source, which compiles to around line 120-160 in JavaScript.

## Rollback Plan

If deployment fails:
```bash
# Rollback to previous commit
git log --oneline -n 5
git checkout <previous-commit-hash>
docker-compose down
docker-compose build
docker-compose up -d
```

## Post-Deployment Test

```bash
# Test a single loan import
curl -X POST "https://your-api.com/jf/loans-migration/import-from-sheets" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected: imported: 1277, errors: 0
```

## Debugging

If still failing:

```bash
# Check compiled JavaScript has the fix
docker exec <container> grep -A 10 "booleanFields" /app/dist/src/jf/services/loans.service.js

# Check for "synced" type in logs
docker logs <container> 2>&1 | grep -i "synced\|parameter 57"

# Verify TypeScript compilation
docker exec <container> ls -lh /app/dist/src/jf/services/loans.service.js
```
