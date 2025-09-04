# Loans API Documentation

## Overview

The Loans API provides a unified endpoint for retrieving loans with comprehensive filtering capabilities. All filters are optional and can be combined to create complex queries.

## Main Endpoint

```
GET /jf/loans
```

## Available Query Parameters

### Basic Filters

- `borrowerId` - Filter by borrower ID
- `sslId` - Filter by SSL ID
- `status` - Filter by loan status (e.g., "Fully Paid", "Active")
- `riskCategory` - Filter by risk category (e.g., "Green", "Yellow", "Red", "Orange")
- `region` - Filter by region (e.g., "Nairobi West", "Central")
- `loanType` - Filter by loan type (e.g., "Working Capital", "Asset Finance")

### Specialized Filters

- `par` - Filter by PAR days (14, 30, 60, 90, 120)
- `overdue` - Filter by overdue status (true/false)
- `fullyPaid` - Filter by fully paid status (true/false)
- `restructured` - Filter by restructured status (true/false)
- `referral` - Filter by referral status (true/false)
- `catalyzeEligible` - Filter by catalyze eligibility (true/false)
- `highRisk` - Filter for high-risk loans (Red/Orange risk category or overdue)

## Example Usage

### Get all loans

```bash
GET /jf/loans
```

### Get loans for a specific borrower

```bash
GET /jf/loans?borrowerId=3536704f
```

### Get overdue loans

```bash
GET /jf/loans?overdue=true
```

### Get high-risk loans

```bash
GET /jf/loans?highRisk=true
```

### Get PAR 30 loans

```bash
GET /jf/loans?par=30
```

### Get loans by region and risk category

```bash
GET /jf/loans?region=Nairobi%20West&riskCategory=Red
```

### Complex filter combination

```bash
GET /jf/loans?loanType=Working%20Capital&overdue=true&highRisk=true
```

## Response Format

All endpoints return responses in a consistent format:

### Success Response

```json
{
  "success": true,
  "data": [...], // Array of loan records or single loan object
  "source": "postgres",
  "total": 150,  // Total number of matching records (for list endpoints)
  "filters": ["loanType", "overdue", "highRisk"], // Applied filters (for filtered lists)
  "message": "Operation completed successfully" // For create/update/delete operations
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Other Endpoints

### Get loan summary statistics

```
GET /jf/loans/summary
```

### Get specific loan by ID

```
GET /jf/loans/:id
```

### Create new loan

```
POST /jf/loans
```

### Update loan

```
PATCH /jf/loans/:id
```

### Delete loan

```
DELETE /jf/loans/:id
```

## Notes

- All string filters are case-sensitive
- Boolean filters accept "true" or "false" as strings
- PAR filter only accepts valid values: 14, 30, 60, 90, 120
- Results are ordered by creation date (newest first)
- All filters are optional and can be combined
