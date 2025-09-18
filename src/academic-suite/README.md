# Academic Suite Module

The Academic Suite module is a dedicated module for managing academic-related functionality in the application. This module is separate from the main JF (Juhudi Finance) module to provide better organization and separation of concerns.

## Module Structure

```
src/academic-suite/
├── controllers/
│   └── customer.controller.ts      # Customer management endpoints
├── services/
│   └── customer-db.service.ts      # Customer database operations
├── dto/
│   └── create-customer.dto.ts      # Customer validation DTOs
├── academic-suite.module.ts        # Module configuration
└── README.md                       # This file
```

## Features

### Customer Management

- **Complete CRUD Operations** for customer accounts
- **File Upload Support** for company logos
- **Data Validation** with comprehensive error handling
- **Search and Filtering** capabilities
- **Statistics Dashboard** support

## API Endpoints

### Base URL

```
/academic-suite/customers
```

### Available Endpoints

| Method | Endpoint                                | Description                        |
| ------ | --------------------------------------- | ---------------------------------- |
| POST   | `/academic-suite/customers`             | Create new customer                |
| GET    | `/academic-suite/customers`             | Get all customers (with filtering) |
| GET    | `/academic-suite/customers/:id`         | Get customer by ID                 |
| PUT    | `/academic-suite/customers/:id`         | Update customer                    |
| PUT    | `/academic-suite/customers/:id/status`  | Update customer status             |
| PUT    | `/academic-suite/customers/:id/schools` | Update school count                |
| DELETE | `/academic-suite/customers/:id`         | Delete customer                    |
| GET    | `/academic-suite/customers/statistics`  | Get customer statistics            |

## Dependencies

The Academic Suite module depends on:

- **CommonModule** - Shared utilities and services
- **PrismaService** - Database operations
- **FileUploadService** - File handling (from JF module)
- **GoogleDriveService** - Cloud storage (from JF module)

## Environment Variables

The module requires the following environment variables:

```env
GOOGLE_DRIVE_CUSTOMER_LOGOS_FOLDER_ID=your_folder_id
GOOGLE_DRIVE_CUSTOMER_LOGOS_FOLDER_NAME=your_folder_name
```

## Database Schema

The module uses the following database tables:

### Customer Table

```sql
CREATE TABLE "Customer" (
  "id" SERIAL PRIMARY KEY,
  "companyLogo" TEXT,
  "companyName" TEXT NOT NULL,
  "contactPerson" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "emailAddress" TEXT UNIQUE NOT NULL,
  "numberOfSchools" INTEGER DEFAULT 0,
  "status" "CustomerStatus" DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
```

### CustomerStatus Enum

```sql
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');
```

## Usage Examples

### Creating a Customer

```typescript
const customerData = {
  companyName: 'Example School',
  contactPerson: 'John Doe',
  phoneNumber: '+254712345678',
  emailAddress: 'john@example.com',
  numberOfSchools: 5,
  status: 'ACTIVE',
};

const response = await fetch('/academic-suite/customers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(customerData),
});
```

### Getting Customer Statistics

```typescript
const response = await fetch('/academic-suite/customers/statistics');
const stats = await response.json();
// Returns: { total, active, inactive, pending, suspended, totalSchools }
```

## File Upload

The module supports file uploads for company logos:

- **Supported Formats**: PNG, JPG, JPEG
- **Maximum Size**: 5MB
- **Storage**: Local filesystem with Google Drive integration
- **Field Name**: `companyLogo`

## Validation Rules

- **companyName**: Required, string
- **contactPerson**: Required, string
- **phoneNumber**: Required, string
- **emailAddress**: Required, valid email format, unique
- **numberOfSchools**: Optional, integer between 0 and 10000, defaults to 0
- **status**: Optional, must be one of: ACTIVE, INACTIVE, PENDING, SUSPENDED, defaults to ACTIVE

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

## Future Enhancements

The Academic Suite module is designed to be extensible. Future features may include:

- **School Management** - Direct school account management
- **Academic Records** - Student and academic data management
- **Reporting** - Academic performance and analytics
- **Integration** - Third-party academic system integrations

## Migration from JF Module

The Customer functionality was moved from the JF module to provide better separation of concerns:

- **Old Endpoint**: `/jf/customers`
- **New Endpoint**: `/academic-suite/customers`
- **Database**: No changes required (same schema)
- **Functionality**: Identical feature set

## Development

To add new features to the Academic Suite module:

1. Create new controllers in `src/academic-suite/controllers/`
2. Create new services in `src/academic-suite/services/`
3. Create new DTOs in `src/academic-suite/dto/`
4. Update the module configuration in `academic-suite.module.ts`
5. Add tests and documentation

## Testing

The module can be tested using the provided API endpoints. All endpoints support:

- **Success Responses** with proper data structure
- **Error Responses** with descriptive error messages
- **Validation** with comprehensive input validation
- **File Upload** with proper file handling

