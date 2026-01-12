# 🚨 DEPLOY NOW - Step by Step Instructions

## The Problem
Your remote server is running **OLD compiled JavaScript** code that doesn't have the boolean fix. The error "incorrect binary data format in bind parameter 57" happens because `synced: true` is being converted to `synced: "true"` (string) which PostgreSQL rejects.

## The Solution
Rebuild your Docker container to recompile TypeScript with the new fix.

---

## 🎯 FASTEST METHOD - Use the Script

### Step 1: Update the script with your server details

Edit `QUICK_DEPLOY.sh` and update these lines:
```bash
SERVER_IP="your-actual-ip"      # e.g., "143.198.123.45"
SERVER_USER="root"              # or your SSH user
APP_DIR="/var/www/jf-backend"   # your app directory on server
```

### Step 2: Run the script
```bash
./QUICK_DEPLOY.sh
```

That's it! The script will handle everything automatically.

---

## 📋 MANUAL METHOD - If you prefer step-by-step

### Prerequisites
- SSH access to your DigitalOcean server
- Docker and docker-compose installed on server
- Your code committed to Git

### Step 1: Commit your changes (if not done)
```bash
# On your local machine
cd /Users/dnyongo/Desktop/projects/JF/jf-backend

git status
git add src/jf/services/loans.service.ts
git commit -m "Fix: Handle synced field as boolean instead of string"
git push origin main
```

### Step 2: SSH into your server
```bash
ssh your-user@your-server-ip

# Example:
# ssh root@143.198.123.45
```

### Step 3: Navigate to your app directory
```bash
cd /var/www/jf-backend
# Or wherever your app is located

# Verify you're in the right place
ls -la
# Should see: Dockerfile, docker-compose.yml, package.json, etc.
```

### Step 4: Pull the latest code
```bash
git pull origin main

# Verify the fix is there
grep -n "booleanFields" src/jf/services/loans.service.ts
# Should output: const booleanFields = ['synced'];
```

### Step 5: Stop the running containers
```bash
docker-compose down

# OR if you're using docker run:
# docker stop jf-backend
# docker rm jf-backend
```

### Step 6: Rebuild the Docker image (CRITICAL STEP)
```bash
# Use --no-cache to ensure fresh compile
docker-compose build --no-cache

# This will:
# 1. Install dependencies
# 2. Generate Prisma client
# 3. Compile TypeScript to JavaScript (with your fix!)
# 4. Create the Docker image
```

⏱️ This step takes 2-5 minutes depending on your server speed.

### Step 7: Start the containers
```bash
docker-compose up -d

# Check if it's running
docker-compose ps
```

### Step 8: Wait for initialization (30 seconds)
```bash
sleep 30
```

### Step 9: Verify the fix is in place
```bash
# Get your container name
CONTAINER=$(docker-compose ps -q | head -n1)

# Check if boolean fix is in compiled code
docker exec $CONTAINER grep "booleanFields" /app/dist/src/jf/services/loans.service.js

# Should output: const booleanFields = ['synced'];
```

✅ If you see the output above, the fix is deployed!

### Step 10: Check the logs
```bash
docker-compose logs --tail 50

# OR follow logs in real-time
docker-compose logs -f
```

### Step 11: Test the import endpoint
```bash
# From your local machine or server:
curl -X GET "https://your-api.com/jf/loans-migration/status"

# Then test import:
curl -X POST "https://your-api.com/jf/loans-migration/import-from-sheets" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "success": true,
#   "imported": 1277,
#   "skipped": 0,
#   "errors": 0
# }
```

---

## ✅ Verification Checklist

After deployment, verify these:

- [ ] Latest code pulled: `git log -1`
- [ ] Container rebuilt: Check timestamp with `docker images | grep jf-backend`
- [ ] Container running: `docker-compose ps` shows "Up"
- [ ] Boolean fix present: `docker exec <container> grep booleanFields /app/dist/src/jf/services/loans.service.js`
- [ ] No errors in logs: `docker-compose logs --tail 100 | grep -i error`
- [ ] Migration status works: `curl /jf/loans-migration/status`
- [ ] Import works: `curl -X POST /jf/loans-migration/import-from-sheets`
- [ ] All 1277 loans imported: Check response has `"imported": 1277`

---

## 🔥 TROUBLESHOOTING

### Issue 1: "booleanFields" not found in compiled code

**Cause**: Docker used cached layers with old code

**Fix**:
```bash
# Force complete rebuild
docker-compose down
docker system prune -f  # Clean up old images
docker-compose build --no-cache --pull
docker-compose up -d
```

### Issue 2: Still getting "parameter 57" error

**Cause**: Container didn't restart properly or wrong container

**Fix**:
```bash
# Check which container is actually running
docker ps

# Verify it's the newly built one (check CREATED time)
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"

# Force remove and recreate
docker-compose rm -sf
docker-compose up -d --force-recreate
```

### Issue 3: "git pull" says "already up to date"

**Cause**: You forgot to push from local machine

**Fix**:
```bash
# On your LOCAL machine:
cd /Users/dnyongo/Desktop/projects/JF/jf-backend
git push origin main

# Then on server:
git pull origin main
```

### Issue 4: Import still failing with different error

**Check logs**:
```bash
docker-compose logs --tail 200 | grep -A 10 -B 10 "error"
```

**Enable debug logging** in loans.service.ts (temporarily):
```typescript
// Before prisma.loan.create (around line 133)
console.log('DEBUG - Data types:');
console.log('synced:', typeof data.synced, data.synced);
console.log('hasFemaleDirector:', typeof data.hasFemaleDirector, data.hasFemaleDirector);
console.log('principalAmount:', typeof data.principalAmount, data.principalAmount);
```

Then rebuild and check logs.

---

## 📞 Quick Commands Reference

```bash
# Connect to server
ssh user@server-ip

# Go to app directory
cd /var/www/jf-backend

# Quick rebuild
docker-compose down && docker-compose build --no-cache && docker-compose up -d

# Check logs
docker-compose logs -f

# Check if fix is deployed
docker-compose exec app grep "booleanFields" /app/dist/src/jf/services/loans.service.js

# Test import
curl -X POST https://your-api.com/jf/loans-migration/import-from-sheets
```

---

## 🎉 Success Indicators

You'll know it worked when:

1. ✅ No "parameter 57" errors in logs
2. ✅ Import endpoint returns `"imported": 1277, "errors": 0`
3. ✅ Database has 1277 loans:
   ```bash
   docker-compose exec app npx prisma studio
   # Then check Loan table count
   ```

---

## 🆘 Need Help?

If deployment fails:

1. Check the logs: `docker-compose logs --tail 200`
2. Verify TypeScript source: `cat src/jf/services/loans.service.ts | grep -A 5 booleanFields`
3. Verify compiled JS: `docker exec <container> cat /app/dist/src/jf/services/loans.service.js | grep -A 5 booleanFields`
4. Check Dockerfile for proper build steps
5. Ensure Prisma generates after code copy in Dockerfile

---

**Time to deploy**: 5-10 minutes total
**Downtime**: ~2-3 minutes (during rebuild)

Good luck! 🚀
