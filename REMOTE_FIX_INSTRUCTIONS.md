# Fix Container Exit Issue - Remote Server Instructions

## Problem
Container `nestjs_app` exits immediately with status code 1, preventing the application from starting.

## Root Causes Fixed
1. ✅ **SSL Certificate Handling**: App now gracefully handles missing SSL certificates
2. ✅ **Migration Failures**: Startup script continues even if migrations fail
3. ✅ **Error Logging**: Better error messages to diagnose issues

## Steps to Fix on Remote Server

### Step 1: Check Current Logs
```bash
docker compose logs nestjs_app --tail 50
```

This will show you the exact error causing the container to exit.

### Step 2: Fix Failed Migration (If Needed)
If you see migration errors, run:

```bash
# Mark failed migration as rolled back
docker compose exec nestjs_app npx prisma migrate resolve --rolled-back 20260112153158_update_loan_fields_to_numeric

# Reapply migrations
docker compose exec nestjs_app npx prisma migrate deploy
```

### Step 3: Rebuild and Redeploy

On your **local machine**, rebuild the Docker image with the fixes:

```bash
# Build the new image
docker build -t aak-backend-nestjs_app .

# Or if using docker-compose
docker compose build nestjs_app
```

Then push/deploy to your remote server.

### Step 4: Restart Container

On your **remote server**:

```bash
# Stop the container
docker compose stop nestjs_app

# Remove the old container
docker compose rm -f nestjs_app

# Start with new image
docker compose up -d nestjs_app

# Check logs
docker compose logs -f nestjs_app
```

### Step 5: Run Diagnostics (Optional)

If the container still exits, run diagnostics:

```bash
# Copy diagnose-container.sh to the container first (or run manually)
docker compose exec nestjs_app sh -c "
  echo 'Checking Prisma client...'
  ls -la node_modules/.prisma/ 2>&1 | head -5
  echo ''
  echo 'Checking dist...'
  ls -la dist/src/ 2>&1 | head -5
  echo ''
  echo 'Checking SSL...'
  ls -la ssl/ 2>&1
  echo ''
  echo 'Testing Prisma...'
  npx prisma --version
"
```

## Expected Behavior After Fix

1. Container should start and stay running
2. Logs should show:
   - "🔄 Generating Prisma client..."
   - "🔄 Attempting to run database migrations..."
   - "🚀 Starting NestJS application..."
   - "🚀 Server is running on http://0.0.0.0:3000"

3. If migrations fail, you'll see warnings but the app will still start

## If Container Still Exits

1. **Check the exact error** in logs: `docker compose logs nestjs_app`
2. **Verify database connection**: Ensure `postgres_container` is running
3. **Check environment variables**: Ensure `.env` file has correct `DATABASE_URL`
4. **Verify Prisma client**: Run `docker compose exec nestjs_app npx prisma generate`

## Quick Test

Once the container is running, test it:

```bash
# Check if app is responding
curl http://localhost:3000

# Or from outside the server
curl http://YOUR_SERVER_IP:3000
```
