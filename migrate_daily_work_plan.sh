#!/bin/bash

# Migration script for daily_work_plan table
# This script exports data from local DB and imports to remote DB
# It handles conflicts to preserve existing data

echo "=========================================="
echo "Daily Work Plan Migration Script"
echo "=========================================="

# Local database connection (from your .env)
LOCAL_DB="postgresql://postgres:NyNj92@localhost:5432/nest"

# Remote database connection - UPDATE THESE VALUES
# Get these from pgAdmin connection details
REMOTE_DB_HOST="${REMOTE_DB_HOST:-localhost}"
REMOTE_DB_PORT="${REMOTE_DB_PORT:-5432}"
REMOTE_DB_NAME="${REMOTE_DB_NAME:-nest}"
REMOTE_DB_USER="${REMOTE_DB_USER:-postgres}"
REMOTE_DB_PASSWORD="${REMOTE_DB_PASSWORD}"

# Check if remote password is provided
if [ -z "$REMOTE_DB_PASSWORD" ]; then
    echo "Please provide remote database password:"
    read -s REMOTE_DB_PASSWORD
    echo ""
fi

REMOTE_DB="postgresql://${REMOTE_DB_USER}:${REMOTE_DB_PASSWORD}@${REMOTE_DB_HOST}:${REMOTE_DB_PORT}/${REMOTE_DB_NAME}"

echo "Step 1: Checking local database..."
LOCAL_COUNT=$(PGPASSWORD=NyNj92 psql -U postgres -d nest -t -c "SELECT COUNT(*) FROM daily_work_plan;" | xargs)
echo "Local daily_work_plan records: $LOCAL_COUNT"

echo ""
echo "Step 2: Checking remote database..."
REMOTE_COUNT=$(PGPASSWORD="$REMOTE_DB_PASSWORD" psql -h "$REMOTE_DB_HOST" -p "$REMOTE_DB_PORT" -U "$REMOTE_DB_USER" -d "$REMOTE_DB_NAME" -t -c "SELECT COUNT(*) FROM daily_work_plan;" 2>/dev/null | xargs)
if [ $? -eq 0 ]; then
    echo "Remote daily_work_plan records (before migration): $REMOTE_COUNT"
else
    echo "Error connecting to remote database. Please check your connection details."
    exit 1
fi

echo ""
echo "Step 3: Exporting data from local database..."
EXPORT_FILE="/tmp/daily_work_plan_export_$(date +%Y%m%d_%H%M%S).sql"
PGPASSWORD=NyNj92 pg_dump -U postgres -d nest -t daily_work_plan --data-only --column-inserts > "$EXPORT_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "Export completed: $EXPORT_FILE"
    echo "Records in export file: $(grep -c "INSERT INTO" "$EXPORT_FILE" 2>/dev/null || echo "0")"
else
    echo "Export failed!"
    exit 1
fi

echo ""
echo "Step 4: Creating migration SQL with conflict handling..."
MIGRATION_FILE="/tmp/daily_work_plan_migration_$(date +%Y%m%d_%H%M%S).sql"

# Create migration file that handles conflicts
cat > "$MIGRATION_FILE" << 'EOF'
-- Migration script for daily_work_plan
-- This script inserts data only if it doesn't already exist (based on id)

BEGIN;

-- Create temporary table to hold the new data
CREATE TEMP TABLE daily_work_plan_temp (LIKE daily_work_plan INCLUDING ALL);

EOF

# Append the INSERT statements from export, but modify them to use the temp table
# Extract all INSERT statements and replace table name
grep "^INSERT INTO" "$EXPORT_FILE" | sed 's/INSERT INTO public.daily_work_plan/INSERT INTO daily_work_plan_temp/g' >> "$MIGRATION_FILE"

# Add conflict resolution logic
cat >> "$MIGRATION_FILE" << 'EOF'

-- Save count before insert for summary
DO $$
DECLARE
    total_remote_before INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_remote_before FROM daily_work_plan;
    -- Store in a temp variable we can access later
    PERFORM set_config('migration.remote_before', total_remote_before::text, false);
END $$;

-- Insert only records that don't exist (based on id)
-- This preserves existing records in remote database
-- Records with matching IDs will be skipped to preserve remote data
INSERT INTO daily_work_plan 
SELECT * FROM daily_work_plan_temp
ON CONFLICT (id) DO NOTHING;

-- Show summary
DO $$
DECLARE
    inserted_count INTEGER;
    skipped_count INTEGER;
    total_temp INTEGER;
    total_remote_before INTEGER;
    total_remote_after INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_temp FROM daily_work_plan_temp;
    total_remote_before := current_setting('migration.remote_before')::INTEGER;
    SELECT COUNT(*) INTO total_remote_after FROM daily_work_plan;
    
    -- Calculate inserted count (difference in total records)
    inserted_count := total_remote_after - total_remote_before;
    skipped_count := total_temp - inserted_count;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Total records in export: %', total_temp;
    RAISE NOTICE '  Remote records (before): %', total_remote_before;
    RAISE NOTICE '  New records inserted: %', inserted_count;
    RAISE NOTICE '  Records skipped (ID already exists): %', skipped_count;
    RAISE NOTICE '  Total records in remote DB now: %', total_remote_after;
    RAISE NOTICE '========================================';
END $$;

COMMIT;

DROP TABLE IF EXISTS daily_work_plan_temp;
EOF

echo "Migration file created: $MIGRATION_FILE"

echo ""
echo "Step 5: Importing data to remote database..."
echo "This will skip any records that already exist (based on id)..."

PGPASSWORD="$REMOTE_DB_PASSWORD" psql -h "$REMOTE_DB_HOST" -p "$REMOTE_DB_PORT" -U "$REMOTE_DB_USER" -d "$REMOTE_DB_NAME" -f "$MIGRATION_FILE" 2>&1 | tail -20

if [ $? -eq 0 ]; then
    echo ""
    echo "Step 6: Verifying migration..."
    FINAL_COUNT=$(PGPASSWORD="$REMOTE_DB_PASSWORD" psql -h "$REMOTE_DB_HOST" -p "$REMOTE_DB_PORT" -U "$REMOTE_DB_USER" -d "$REMOTE_DB_NAME" -t -c "SELECT COUNT(*) FROM daily_work_plan;" | xargs)
    echo "Remote daily_work_plan records (after migration): $FINAL_COUNT"
    echo ""
    echo "=========================================="
    echo "Migration completed successfully!"
    echo "=========================================="
    echo "Local records: $LOCAL_COUNT"
    echo "Remote records (before): $REMOTE_COUNT"
    echo "Remote records (after): $FINAL_COUNT"
    echo "New records added: $((FINAL_COUNT - REMOTE_COUNT))"
else
    echo ""
    echo "Migration failed! Please check the error messages above."
    exit 1
fi

echo ""
echo "Cleanup: Migration files saved at:"
echo "  Export: $EXPORT_FILE"
echo "  Migration: $MIGRATION_FILE"

