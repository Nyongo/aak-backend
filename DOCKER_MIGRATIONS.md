# Docker Migrations Guide

## Overview

This guide explains how Prisma migrations are handled in the Docker deployment setup.

## Automatic Migrations

Migrations run automatically when the container starts via the `start:prod` script:

```json
"start:prod": "npx prisma migrate deploy && node dist/src/main"
```

## Manual Migration Commands

### Option 1: Using the migration script

```bash
./run-migrations.sh
```

### Option 2: Direct Docker command

```bash
docker compose exec nestjs_app npx prisma migrate deploy
```

### Option 3: During deployment

The `deploy.sh` script automatically runs migrations after containers start.

## Troubleshooting

### Migrations not running?

1. **Check if Prisma is installed in production:**

   ```bash
   docker compose exec nestjs_app npm list prisma
   ```

   - If not found, ensure `prisma` is in `dependencies` (not `devDependencies`) in `package.json`

2. **Check if migrations folder exists in container:**

   ```bash
   docker compose exec nestjs_app ls -la prisma/migrations
   ```

3. **Check migration status:**

   ```bash
   docker compose exec nestjs_app npx prisma migrate status
   ```

4. **Manually run migrations:**
   ```bash
   docker compose exec nestjs_app npx prisma migrate deploy
   ```

### Database connection issues?

1. **Verify DATABASE_URL is set correctly:**

   ```bash
   docker compose exec nestjs_app env | grep DATABASE_URL
   ```

2. **Test database connection:**
   ```bash
   docker compose exec nestjs_app npx prisma db pull
   ```

## Important Notes

- The `prisma` package must be in `dependencies` (not `devDependencies`) for migrations to work in production
- Migrations are automatically copied to the Docker container via the `prisma/` folder
- The `start:prod` script runs migrations before starting the application
- If migrations fail, the application won't start (fail-fast behavior)
