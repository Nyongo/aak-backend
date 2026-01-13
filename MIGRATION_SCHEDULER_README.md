# Migration Scheduler Service

## Overview
The Migration Scheduler Service automatically runs all Google Sheets migrations **hourly** at the top of every hour.

## Features
- ✅ Runs all 26 migration endpoints automatically
- ✅ Executes at minute 0 of every hour (e.g., 1:00, 2:00, 3:00, etc.)
- ✅ Timezone: Africa/Nairobi (configurable)
- ✅ Sequential execution to avoid overwhelming the system
- ✅ Comprehensive logging and error handling
- ✅ Summary reports after each run

## Scheduled Migrations
The scheduler runs the following migrations hourly:
1. Borrowers
2. Directors
3. CRB Consents
4. Referrers
5. Credit Applications
6. Active Debts
7. Fee Plans
8. Payroll
9. Enrollment Verification
10. Mpesa Bank Statements
11. Audited Financials
12. Student Breakdown
13. Other Supporting Docs
14. Investment Committee
15. Vendor Disbursement Details
16. Financial Surveys
17. Home Visits
18. Asset Titles
19. Contract Details
20. Credit Application Comments
21. Direct Payment Schedules
22. Principal Tranches
23. Direct Lending Processing
24. Impact Survey
25. Loans
26. Write Offs

## Configuration

### Environment Variables
- `API_BASE_URL` or `MIGRATION_BASE_URL`: Base URL for API calls (default: `http://localhost:3000`)
- Timezone is set to `Africa/Nairobi` (can be modified in the service)

### Cron Schedule
- **Current**: `0 * * * *` (every hour at minute 0)
- **Format**: `minute hour day month weekday`
- **Examples**:
  - `0 * * * *` - Every hour
  - `0 */2 * * *` - Every 2 hours
  - `0 9,17 * * *` - At 9 AM and 5 PM daily
  - `0 0 * * *` - Once daily at midnight

## API Endpoints

### Get Scheduler Status
```bash
GET /jf/migration-scheduler/status
```

Returns:
```json
{
  "success": true,
  "message": "Migration scheduler is active",
  "schedule": {
    "frequency": "Hourly",
    "cronExpression": "0 * * * *",
    "timeZone": "Africa/Nairobi",
    "nextRun": "At the top of every hour"
  },
  "availableMigrations": [...]
}
```

### Manually Trigger All Migrations
```bash
POST /jf/migration-scheduler/run-all
```

Runs all migrations immediately (useful for testing).

### Run Specific Migration
```bash
POST /jf/migration-scheduler/run?name=Loans
POST /jf/migration-scheduler/run?name=Write Offs
```

Runs a specific migration by name.

## Logging

The scheduler logs:
- ✅ Start of hourly migration run
- ✅ Progress for each migration (imported, skipped, errors)
- ✅ Summary after completion
- ❌ Errors for failed migrations

Example log output:
```
🔄 Starting scheduled hourly migrations...
Running migration: Loans...
✅ Loans: Imported 1277, Skipped 0, Errors 0 (4523ms)
Running migration: Write Offs...
✅ Write Offs: Imported 368, Skipped 0, Errors 0 (1234ms)
✅ Hourly migrations completed: 26 successful, 0 failed, 5000 total imported, 0 total errors (125000ms)
```

## Monitoring

### Check Logs
```bash
# View recent scheduler logs
docker compose logs nestjs_app | grep "Migration Scheduler"

# View all migration activity
docker compose logs nestjs_app | grep -E "migration|Migration"
```

### Verify Scheduler is Running
```bash
# Check if scheduler service is loaded
curl -X GET http://localhost:3000/jf/migration-scheduler/status
```

## Troubleshooting

### Scheduler Not Running
1. Check if `ScheduleModule.forRoot()` is imported in `jf.module.ts`
2. Verify `MigrationSchedulerService` is in providers
3. Check application logs for initialization messages
4. Ensure the application is running (not just built)

### Migrations Failing
1. Check individual migration endpoints manually
2. Verify Google Sheets API access
3. Check database connectivity
4. Review error logs for specific migration failures

### Change Schedule Frequency
Edit `src/jf/services/migration-scheduler.service.ts`:
```typescript
@Cron('0 * * * *', {  // Change this cron expression
  name: 'hourly-migrations',
  timeZone: 'Africa/Nairobi',
})
```

## Disabling the Scheduler

To temporarily disable automatic migrations:
1. Comment out the `@Cron` decorator in `migration-scheduler.service.ts`
2. Or remove `MigrationSchedulerService` from providers in `jf.module.ts`

## Manual Execution

You can always trigger migrations manually:
```bash
# Run all migrations
curl -X POST http://localhost:3000/jf/migration-scheduler/run-all

# Run specific migration
curl -X POST "http://localhost:3000/jf/migration-scheduler/run?name=Loans"
```
