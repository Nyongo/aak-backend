# Loans Migration Controller Documentation

## Overview

The Loans Migration Controller handles importing loans from Google Sheets to the local database, providing status monitoring, comparison tools, and comprehensive migration capabilities.

## Endpoints

### 1. Get Migration Status

```
GET /jf/loans-migration/status
```

**Purpose**: Check the current synchronization status between Google Sheets and the database.

**Response**:

```json
{
  "success": true,
  "database": {
    "total": 150
  },
  "sheets": {
    "total": 150
  },
  "syncStatus": "Synced"
}
```

### 2. Import from Google Sheets

```
POST /jf/loans-migration/import-from-sheets
```

**Purpose**: Import all loans from the "Loans" Google Sheet to the local database.

**Optional Query Parameters**:

- `borrowerId` - Import loans for a specific borrower only

**Response**:

```json
{
  "success": true,
  "message": "Import completed",
  "imported": 145,
  "skipped": 5,
  "errors": 0,
  "skippedDetails": [
    {
      "loan": "Working Capital",
      "sheetId": "93346221",
      "reason": "Already exists in database"
    }
  ]
}
```

### 3. Full Migration

```
POST /jf/loans-migration/full-migration
```

**Purpose**: Perform a complete migration, checking status first and importing if needed.

**Response**: Same as import-from-sheets, but includes status checking.

### 4. Compare Loan

```
GET /jf/loans-migration/compare/:sheetId
```

**Purpose**: Compare a specific loan between Google Sheets and the database.

**Parameters**:

- `sheetId` - The ID from the Google Sheet

**Response**:

```json
{
  "success": true,
  "comparison": {
    "sheets": {
      /* Google Sheets data */
    },
    "database": {
      /* Database data */
    },
    "differences": [
      {
        "field": "loanStatus",
        "sheets": "Active",
        "database": "Fully Paid"
      }
    ]
  }
}
```

### 5. Get Sheet Columns

```
GET /jf/loans-migration/columns
```

**Purpose**: Retrieve all column names from the Loans Google Sheet with sample values.

**Response**:

```json
{
  "success": true,
  "message": "Loans sheet columns retrieved successfully",
  "totalColumns": 123,
  "columns": [
    {
      "index": 1,
      "name": "ID",
      "sampleValue": "93346221"
    },
    {
      "index": 2,
      "name": "Loan Type",
      "sampleValue": "Working Capital"
    }
  ]
}
```

### 6. Sync to Google Sheets (Read-only)

```
POST /jf/loans-migration/sync-to-sheets
```

**Purpose**: Currently read-only. Future implementation will sync database changes back to Google Sheets.

**Response**:

```json
{
  "success": true,
  "message": "Sync to Google Sheets is read-only for now",
  "synced": 0
}
```

## Migration Process

### 1. **Data Validation**

- Checks for empty records
- Validates ID field presence
- Skips records with missing critical data

### 2. **Duplicate Prevention**

- Checks if loan already exists in database using `sheetId`
- Skips existing records to prevent duplicates

### 3. **Data Mapping**

- Maps all 123 columns from Google Sheets to database fields
- Handles field name variations and formatting
- Preserves all original data

### 4. **Error Handling**

- Comprehensive error logging
- Continues processing on individual record failures
- Provides detailed error and skip reports

## Field Mapping

The controller maps all Google Sheet columns to the corresponding database fields:

| Sheet Column     | Database Field  |
| ---------------- | --------------- |
| ID               | sheetId         |
| Loan Type        | loanType        |
| Borrower Type    | borrowerType    |
| Principal Amount | principalAmount |
| Interest Type    | interestType    |
| ...              | ...             |

## Usage Examples

### Check Migration Status

```bash
curl -X GET http://localhost:3000/jf/loans-migration/status
```

### Import All Loans

```bash
curl -X POST http://localhost:3000/jf/loans-migration/import-from-sheets
```

### Import Loans for Specific Borrower

```bash
curl -X POST "http://localhost:3000/jf/loans-migration/import-from-sheets?borrowerId=3536704f"
```

### Perform Full Migration

```bash
curl -X POST http://localhost:3000/jf/loans-migration/full-migration
```

### Compare Specific Loan

```bash
curl -X GET http://localhost:3000/jf/loans-migration/compare/93346221
```

### View Sheet Columns

```bash
curl -X GET http://localhost:3000/jf/loans-migration/columns
```

## Notes

- **Read-only from sheets**: Currently only imports from Google Sheets to database
- **ID field**: Uses the "ID" column from Google Sheets as the unique identifier
- **Bulk operations**: Processes all records in a single request
- **Error resilience**: Continues processing even if individual records fail
- **Duplicate prevention**: Automatically skips existing records
- **Comprehensive logging**: Detailed logs for debugging and monitoring

## Future Enhancements

- **Bidirectional sync**: Sync database changes back to Google Sheets
- **Incremental updates**: Only sync changed records
- **Conflict resolution**: Handle data conflicts between sources
- **Scheduled sync**: Automatic periodic synchronization
- **Webhook support**: Real-time sync triggers
