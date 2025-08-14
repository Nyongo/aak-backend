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

#### Import Operations

- `POST /import?spreadsheetId=xxx` - Import data from Google Sheets
- `GET /status?spreadsheetId=xxx` - Get migration status
- `GET /preview?spreadsheetId=xxx` - Preview sheet data before import
- `POST /validate?spreadsheetId=xxx` - Validate sheet data

## Usage Examples

### 1. Import Existing Records

To import existing records from the "Dir. Payment Schedules" sheet:

```bash
POST /jf/direct-payment-schedules-migration/import?spreadsheetId=YOUR_SPREADSHEET_ID
```

### 2. Preview Data Before Import

```bash
GET /jf/direct-payment-schedules-migration/preview?spreadsheetId=YOUR_SPREADSHEET_ID
```

### 3. Validate Sheet Data

```bash
POST /jf/direct-payment-schedules-migration/validate?spreadsheetId=YOUR_SPREADSHEET_ID
```

### 4. Get Overdue Payments

```bash
GET /jf/direct-payment-schedules/overdue
```

### 5. Get Upcoming Payments

```bash
GET /jf/direct-payment-schedules/upcoming?days=60
```

### 6. Get Payments by Status

```bash
GET /jf/direct-payment-schedules/by-status/PENDING
```

### 7. Get Payments for Specific Borrower

```bash
GET /jf/direct-payment-schedules/by-borrower/BORROWER_ID
```

## Data Validation

The migration controller includes comprehensive data validation:

- **Required Fields**: Borrower ID, School ID, or Loan ID (at least one)
- **Required Fields**: Due Date, Amount Due
- **Date Validation**: Supports ISO dates and DD/MM/YYYY format
- **Numeric Validation**: Ensures amount fields are valid numbers

## Sync Process

### From Google Sheets to Database

1. Reads data from "Dir. Payment Schedules" sheet
2. Validates each row
3. Creates new records or updates existing ones
4. Tracks sync status

### To Google Sheets (Read-Only)

- Currently read-only due to API limitations
- Returns data in sheet format for manual review

## Error Handling

- Comprehensive logging for all operations
- Detailed error messages for validation failures
- Graceful handling of API errors
- Transaction rollback on failures

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
- The sync process is designed to be idempotent and safe to run multiple times
