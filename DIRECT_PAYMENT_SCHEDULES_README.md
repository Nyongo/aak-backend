# Direct Payment Schedules

This module provides comprehensive functionality for managing Direct Payment Schedules, which tracks payment schedules for loans and credit applications. The sheet name in Google Sheets is "Dir. Payment Schedules".

## Overview

Direct Payment Schedules track when payments are due, amounts owed, and payment status for various financial products including:

- Principal amounts
- Interest amounts
- Fees and penalties
- Payment due dates
- Payment status tracking

## Database Model

The `DirectPaymentSchedule` model includes the following fields:

- `id`: Primary key
- `sheetId`: Unique identifier from Google Sheets
- `borrowerId`: Reference to borrower
- `schoolId`: Reference to school
- `loanId`: Reference to loan
- `creditApplicationId`: Reference to credit application
- `paymentScheduleNumber`: Payment schedule identifier
- `installmentNumber`: Installment number
- `dueDate`: When payment is due
- `amountDue`: Total amount due
- `principalAmount`: Principal portion
- `interestAmount`: Interest portion
- `feesAmount`: Fees amount
- `penaltyAmount`: Penalty amount
- `totalAmount`: Total amount
- `paymentStatus`: Payment status (PENDING, PAID, etc.)
- `paymentMethod`: How payment was made
- `paymentDate`: When payment was received
- `amountPaid`: Amount actually paid
- `balanceCarriedForward`: Balance carried to next period
- `remarks`: Additional notes
- `createdAt`: Record creation timestamp
- `synced`: Sync status with Google Sheets

## API Endpoints

### Main Controller: `/jf/direct-payment-schedules`

#### CRUD Operations

- `POST /` - Create new payment schedule
- `GET /` - Get all payment schedules
- `GET /:id` - Get specific payment schedule
- `PATCH /:id` - Update payment schedule
- `DELETE /:id` - Delete payment schedule

#### Query Endpoints

- `GET /overdue` - Get overdue payment schedules
- `GET /upcoming?days=30` - Get upcoming payments (default 30 days)
- `GET /by-status/:status` - Get schedules by payment status
- `GET /by-borrower/:borrowerId` - Get schedules for specific borrower
- `GET /by-loan/:loanId` - Get schedules for specific loan

#### Sync Operations

- `POST /sync/from-sheets` - Sync from Google Sheets
- `POST /sync/to-sheets` - Sync to Google Sheets (read-only)
- `GET /sync/status` - Get sync status
- `GET /sync/sheet-data` - Get raw sheet data

### Migration Controller: `/jf/direct-payment-schedules-migration`

#### Migration Operations

- `GET /status` - Get migration status (sheets vs database)
- `POST /import-from-sheets` - Import data from Google Sheets
- `POST /sync-to-sheets` - Sync database changes to sheets (read-only)
- `POST /full-migration` - Run complete import and sync process
- `GET /compare/:sheetId` - Compare specific record between sheets and database

## Usage Examples

### 1. Check Migration Status

```bash
GET /jf/direct-payment-schedules-migration/status
```

This will show you:

- Total records in Google Sheets
- Total records in database
- How many are synced/unsynced
- Sample records from both sources

### 2. Import Data from Google Sheets

```bash
POST /jf/direct-payment-schedules-migration/import-from-sheets
```

This will:

- Read all data from "Dir. Payment Schedules" sheet
- Skip empty records and existing records
- Import new records with `synced = true`
- Return detailed import statistics

### 3. Run Full Migration

```bash
POST /jf/direct-payment-schedules-migration/full-migration
```

This runs both import and sync operations in sequence.

### 4. Compare Specific Record

```bash
GET /jf/direct-payment-schedules-migration/compare/SHEET_ID
```

This compares a specific record between Google Sheets and your database.

### 5. Get Overdue Payments

```bash
GET /jf/direct-payment-schedules/overdue
```

### 6. Get Upcoming Payments

```bash
GET /jf/direct-payment-schedules/upcoming?days=60
```

### 7. Get Payments by Status

```bash
GET /jf/direct-payment-schedules/by-status/PENDING
```

### 8. Get Payments for Specific Borrower

```bash
GET /jf/direct-payment-schedules/by-borrower/BORROWER_ID
```

## Migration Process

### Import from Sheets

1. Reads data from "Dir. Payment Schedules" sheet
2. Validates each row (skips empty records)
3. Checks for existing records (skips duplicates)
4. Converts sheet format to database format
5. Creates new records with `synced = true`
6. Returns detailed import statistics

### Sync to Sheets (Read-Only)

- Currently read-only due to API limitations
- Marks records as synced in database
- In a real implementation, would write back to sheets

## Data Validation

The migration process includes comprehensive validation:

- **Empty Record Detection**: Skips completely empty rows
- **ID Validation**: Ensures records have valid identifiers
- **Duplicate Prevention**: Skips records that already exist
- **Data Conversion**: Properly converts between sheet and database formats

## Error Handling

- Comprehensive logging for all operations
- Detailed error tracking with context
- Graceful handling of individual record failures
- Returns detailed success/error statistics

## Configuration

Ensure the following environment variables are set:

- `GOOGLE_SHEETS_BORROWERS_ID`: Google Sheets ID for the main spreadsheet
- `GOOGLE_SHEETS_BORROWERS_ID_2`: Secondary spreadsheet ID if needed

## Dependencies

- Prisma ORM for database operations
- Google Sheets API for data synchronization
- NestJS framework for API endpoints
- Class-validator for DTO validation

## Notes

- The "Dir" in "Dir. Payment Schedules" refers to "Direct" payments, not "Director"
- All monetary amounts are stored as strings to preserve precision
- Dates are stored as strings to maintain flexibility with various formats
- The migration process is designed to be idempotent and safe to run multiple times
- Follows the exact same pattern as other migration controllers in the system
