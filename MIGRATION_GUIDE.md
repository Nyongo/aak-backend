# Daily Work Plan Migration Guide

This guide explains how to migrate `daily_work_plan` data from your local database to a remote database.

## Prerequisites

- PostgreSQL client tools installed (`psql`, `pg_dump`)
- Access to both local and remote databases
- Remote database connection details from pgAdmin

## Usage

### Option 1: Run with environment variables

```bash
export REMOTE_DB_HOST="your-remote-host"
export REMOTE_DB_PORT="5432"
export REMOTE_DB_NAME="nest"
export REMOTE_DB_USER="postgres"
export REMOTE_DB_PASSWORD="your-password"

./migrate_daily_work_plan.sh
```

### Option 2: Run and enter password when prompted

```bash
export REMOTE_DB_HOST="your-remote-host"
export REMOTE_DB_PORT="5432"
export REMOTE_DB_NAME="nest"
export REMOTE_DB_USER="postgres"

./migrate_daily_work_plan.sh
# You'll be prompted to enter the password
```

### Option 3: Edit the script directly

Edit `migrate_daily_work_plan.sh` and update these lines:

```bash
REMOTE_DB_HOST="${REMOTE_DB_HOST:-your-remote-host}"
REMOTE_DB_PORT="${REMOTE_DB_PORT:-5432}"
REMOTE_DB_NAME="${REMOTE_DB_NAME:-nest}"
REMOTE_DB_USER="${REMOTE_DB_USER:-postgres}"
```

## How It Works

1. **Exports** all data from local `daily_work_plan` table
2. **Checks** remote database connection and current record count
3. **Creates** a migration SQL file with conflict handling
4. **Imports** data using `ON CONFLICT (id) DO NOTHING` to preserve existing records
5. **Reports** summary of inserted vs skipped records

## Conflict Resolution

- Records with **matching IDs** are **skipped** (preserves existing remote data)
- Records with **new IDs** are **inserted**
- No existing data will be lost or overwritten

## Getting Connection Details from pgAdmin

1. Open pgAdmin
2. Right-click on your remote server connection
3. Select "Properties"
4. Note the following:
   - **Host**: Server address
   - **Port**: Usually 5432
   - **Database**: Database name
   - **Username**: Your username
   - **Password**: Your password (you'll need this)

## Example Output

```
==========================================
Daily Work Plan Migration Script
==========================================
Step 1: Checking local database...
Local daily_work_plan records: 4089

Step 2: Checking remote database...
Remote daily_work_plan records (before migration): 150

Step 3: Exporting data from local database...
Export completed: /tmp/daily_work_plan_export_20241105_123456.sql
Records in export file: 4089

Step 4: Creating migration SQL with conflict handling...
Migration file created: /tmp/daily_work_plan_migration_20241105_123456.sql

Step 5: Importing data to remote database...
This will skip any records that already exist (based on id)...
========================================
Migration Summary:
  Total records in export: 4089
  Remote records (before): 150
  New records inserted: 3939
  Records skipped (ID already exists): 150
  Total records in remote DB now: 4089
========================================

Migration completed successfully!
Local records: 4089
Remote records (before): 150
Remote records (after): 4089
New records added: 3939
```
