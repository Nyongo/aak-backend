# User Migration Guide

This guide explains how to migrate users from your Google Sheet "Users" to your PostgreSQL database.

## Overview

The migration system allows you to:

1. **Preview** the migration to see what data will be imported
2. **Migrate** all users from the Google Sheet to PostgreSQL
3. **Check status** of the migration

## Endpoints

### 1. Preview Migration

**GET** `/ssl-tracker/migration/users/preview`

This endpoint shows you:

- Total number of users in the sheet
- Sheet headers (column names)
- Sample data mapping (first 5 rows)
- How the data will be mapped to database fields

**Example Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Migration preview generated successfully"
  },
  "data": {
    "totalRows": 150,
    "headers": ["ID", "Name", "Email", "Type", "Status", ...],
    "sampleData": [
      {
        "rowNumber": 2,
        "data": {
          "ID": "USR001",
          "Name": "John Doe",
          "Email": "john@example.com",
          "Type": "admin",
          "Status": "Active"
        },
        "mappedUser": {
          "email": "john@example.com",
          "name": "John Doe",
          "password": "[hashed]",
          "roleId": 1,
          "isActive": true,
          "requirePasswordReset": true
        }
      }
    ],
    "roleMapping": {
      "admin": 1,
      "user": 2,
      "director": 3,
      "teacher": 4,
      "ssl": 5,
      "farmer": 6,
      "ssp": 7
    }
  }
}
```

### 2. Run Migration

**POST** `/ssl-tracker/migration/users`

This endpoint performs the actual migration:

- Creates new users that don't exist
- Updates existing users (matched by email)
- Skips users without email addresses
- Generates secure default passwords
- Forces password reset for all migrated users

**Example Response:**

```json
{
  "response": {
    "code": 200,
    "message": "User migration completed successfully"
  },
  "data": {
    "total": 150,
    "created": 120,
    "updated": 25,
    "skipped": 5,
    "errors": [],
    "details": [
      {
        "row": 2,
        "email": "john@example.com",
        "status": "created",
        "userId": 1
      },
      {
        "row": 3,
        "email": "jane@example.com",
        "status": "updated",
        "userId": 2
      }
    ]
  }
}
```

### 3. Check Migration Status

**GET** `/ssl-tracker/migration/users/status`

This endpoint shows the current state of users in your database.

**Example Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Migration status retrieved successfully"
  },
  "data": {
    "totalUsers": 145,
    "activeUsers": 140,
    "inactiveUsers": 5,
    "lastMigration": "2024-01-15T10:30:00.000Z"
  }
}
```

## Data Mapping

The migration maps Google Sheet columns to database fields as follows:

| Sheet Column                    | Database Field         | Notes                            |
| ------------------------------- | ---------------------- | -------------------------------- |
| `Email` or `email`              | `email`                | Required field                   |
| `Name` or `name` or `Full Name` | `name`                 | Defaults to "Unknown" if missing |
| `Type` or `User Type`           | `roleId`               | Mapped to role IDs (see below)   |
| `Status` or `Active`            | `isActive`             | Boolean conversion               |
| -                               | `password`             | Auto-generated secure password   |
| -                               | `requirePasswordReset` | Always set to `true`             |

## Role Mapping

User types from the sheet are mapped to role IDs:

| Sheet Type                 | Role ID | Description              |
| -------------------------- | ------- | ------------------------ |
| `admin` or `administrator` | 1       | Administrator            |
| `user` or `staff`          | 2       | Regular User             |
| `director`                 | 3       | Director                 |
| `teacher`                  | 4       | Teacher                  |
| `ssl`                      | 5       | SSL Staff                |
| `farmer`                   | 6       | Farmer                   |
| `ssp`                      | 7       | SSP User                 |
| Any other type             | 2       | Defaults to Regular User |

## Default Password

All migrated users get a default password: `ChangeMe123!`

**Important:** All migrated users will be required to reset their password on first login.

## Usage Steps

1. **Preview the migration first:**

   ```bash
   curl -X GET http://localhost:3000/ssl-tracker/migration/users/preview
   ```

2. **Review the preview data** to ensure the mapping looks correct

3. **Run the migration:**

   ```bash
   curl -X POST http://localhost:3000/ssl-tracker/migration/users
   ```

4. **Check the results** and review any errors

5. **Verify the migration:**
   ```bash
   curl -X GET http://localhost:3000/ssl-tracker/migration/users/status
   ```

## Error Handling

The migration handles various error scenarios:

- **Missing emails**: Users without email addresses are skipped
- **Duplicate emails**: Existing users are updated instead of created
- **Invalid data**: Errors are logged and reported
- **Database errors**: Prisma errors are handled gracefully

## Security Notes

- All migrated users get secure hashed passwords
- Password reset is required for all migrated users
- The migration logs all operations for audit purposes
- No sensitive data is exposed in the API responses

## Troubleshooting

### Common Issues:

1. **"No data found in Users sheet"**

   - Check that the Google Sheet is accessible
   - Verify the sheet name is exactly "Users"
   - Ensure the service account has proper permissions

2. **"Role not found" errors**

   - Verify that the role IDs in the mapping exist in your database
   - Check the `Role` table for available role IDs

3. **"Email already exists" errors**

   - This is normal for existing users
   - The migration will update existing users instead of creating duplicates

4. **"Invalid email format" errors**
   - Check the email format in your Google Sheet
   - Ensure emails are properly formatted

### Getting Help:

If you encounter issues:

1. Check the application logs for detailed error messages
2. Use the preview endpoint to verify data mapping
3. Ensure your Google Sheets API credentials are properly configured
4. Verify your database connection and permissions
