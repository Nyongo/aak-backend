# Customer Management API

This document describes the Customer Management API endpoints for managing customer accounts.

## Base URL

```
/jf/customers
```

## Models

### Customer

- `id`: Integer (Primary Key)
- `companyLogo`: String (Optional) - Path to company logo file
- `companyName`: String (Required) - Name of the company
- `contactPerson`: String (Required) - Name of the contact person
- `phoneNumber`: String (Required) - Phone number
- `emailAddress`: String (Required, Unique) - Email address
- `numberOfSchools`: Integer (Default: 0) - Number of schools associated
- `status`: CustomerStatus (Default: ACTIVE) - Customer status
- `createdAt`: DateTime - Creation timestamp
- `updatedAt`: DateTime - Last update timestamp

### CustomerStatus Enum

- `ACTIVE` - Active customer
- `INACTIVE` - Inactive customer
- `PENDING` - Pending approval
- `SUSPENDED` - Suspended customer

## API Endpoints

### 1. Create Customer

**POST** `/jf/customers`

Creates a new customer account.

**Request Body:**

```json
{
  "companyName": "Example School",
  "contactPerson": "John Doe",
  "phoneNumber": "+254712345678",
  "emailAddress": "john@example.com",
  "numberOfSchools": 5,
  "status": "ACTIVE"
}
```

**File Upload:**

- Field name: `companyLogo`
- Supported formats: PNG, JPG, JPEG
- Maximum size: 5MB

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "companyLogo": "/uploads/customer-logos/logo.png",
    "companyName": "Example School",
    "contactPerson": "John Doe",
    "phoneNumber": "+254712345678",
    "emailAddress": "john@example.com",
    "numberOfSchools": 5,
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Customer created successfully"
}
```

### 2. Get All Customers

**GET** `/jf/customers`

Retrieves all customers with optional filtering.

**Query Parameters:**

- `status` (optional): Filter by customer status
- `search` (optional): Search by company name, contact person, or email

**Examples:**

- `/jf/customers` - Get all customers
- `/jf/customers?status=ACTIVE` - Get active customers only
- `/jf/customers?search=example` - Search for customers containing "example"

**Response:**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "companyLogo": "https://drive.google.com/...",
      "companyName": "Example School",
      "contactPerson": "John Doe",
      "phoneNumber": "+254712345678",
      "emailAddress": "john@example.com",
      "numberOfSchools": 5,
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 3. Get Customer by ID

**GET** `/jf/customers/:id`

Retrieves a specific customer by ID.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "companyLogo": "https://drive.google.com/...",
    "companyName": "Example School",
    "contactPerson": "John Doe",
    "phoneNumber": "+254712345678",
    "emailAddress": "john@example.com",
    "numberOfSchools": 5,
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Customer

**PUT** `/jf/customers/:id`

Updates an existing customer.

**Request Body:**

```json
{
  "companyName": "Updated School Name",
  "contactPerson": "Jane Doe",
  "phoneNumber": "+254798765432",
  "emailAddress": "jane@example.com",
  "numberOfSchools": 10,
  "status": "ACTIVE"
}
```

**File Upload:**

- Field name: `companyLogo`
- Supported formats: PNG, JPG, JPEG
- Maximum size: 5MB

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "companyLogo": "/uploads/customer-logos/new_logo.png",
    "companyName": "Updated School Name",
    "contactPerson": "Jane Doe",
    "phoneNumber": "+254798765432",
    "emailAddress": "jane@example.com",
    "numberOfSchools": 10,
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "Customer updated successfully"
}
```

### 5. Update Customer Status

**PUT** `/jf/customers/:id/status`

Updates only the customer status.

**Request Body:**

```json
{
  "status": "SUSPENDED"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "SUSPENDED",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "Customer status updated successfully"
}
```

### 6. Update School Count

**PUT** `/jf/customers/:id/schools`

Updates the number of schools for a customer.

**Request Body:**

```json
{
  "numberOfSchools": 15
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "numberOfSchools": 15,
    "updatedAt": "2024-01-01T12:00:00.000Z"
  },
  "message": "School count updated successfully"
}
```

### 7. Delete Customer

**DELETE** `/jf/customers/:id`

Deletes a customer account.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "companyName": "Example School",
    "contactPerson": "John Doe",
    "phoneNumber": "+254712345678",
    "emailAddress": "john@example.com",
    "numberOfSchools": 5,
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Customer deleted successfully"
}
```

### 8. Get Customer Statistics

**GET** `/jf/customers/statistics`

Retrieves customer statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 100,
    "active": 85,
    "inactive": 10,
    "pending": 3,
    "suspended": 2,
    "totalSchools": 1250
  }
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

## Validation Rules

- **companyName**: Required, string
- **contactPerson**: Required, string
- **phoneNumber**: Required, string
- **emailAddress**: Required, valid email format, unique
- **numberOfSchools**: Optional, integer between 0 and 10000, defaults to 0
- **status**: Optional, must be one of: ACTIVE, INACTIVE, PENDING, SUSPENDED, defaults to ACTIVE
- **companyLogo**: Optional, file upload (PNG, JPG, JPEG), maximum 5MB

## File Upload

Company logos are uploaded to the local file system and can be accessed via Google Drive links when available. The file upload service handles:

- File type validation (PNG, JPG, JPEG only)
- File size validation (maximum 5MB)
- Secure file naming and storage
- Integration with Google Drive for cloud storage

## Notes

- All timestamps are in UTC format
- Company logos are automatically converted to Google Drive links when available
- Email addresses must be unique across all customers
- The `numberOfSchools` field is designed to be updated as schools are added to the system
- Customer status changes are logged and can be tracked through the `updatedAt` field
