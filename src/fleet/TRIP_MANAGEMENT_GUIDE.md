# Trip Management System Guide

This guide explains how to use the comprehensive trip management system in the fleet management application.

## Overview

The trip management system allows you to:

- Create and schedule trips
- Track trip progress from start to finish
- Automatically calculate trip costs based on distance and price per km
- Record customer information and payment details
- Track fuel consumption and costs
- Get trip statistics and analytics

## Trip Model Features

### **Core Fields:**

- **Vehicle & Driver**: Links to vehicle and driver records
- **Customer Info**: Name and phone number
- **GPS Coordinates**: Start and end GPS coordinates for precise tracking
- **Timing**: Start and end times
- **Pricing**: Automatic cost calculation based on distance and price per km
- **Status Tracking**: SCHEDULED → IN_PROGRESS → COMPLETED
- **Payment**: Payment status and method tracking
- **Fuel Tracking**: Consumption and cost recording
- **Feedback**: Customer ratings and feedback

### **Trip Statuses:**

- `SCHEDULED` - Trip is planned but not started
- `IN_PROGRESS` - Trip is currently active
- `COMPLETED` - Trip has finished
- `CANCELLED` - Trip was cancelled
- `ON_HOLD` - Trip is temporarily paused

### **Payment Statuses:**

- `PENDING` - Payment not yet received
- `PAID` - Full payment received
- `PARTIAL` - Partial payment received
- `REFUNDED` - Payment was refunded
- `CANCELLED` - Payment was cancelled

## API Endpoints

### **Trip Creation**

```
POST /fleet/trips
```

**Sample Request:**

```json
{
  "vehicleId": 1,
  "driverId": 1,
  "customerName": "John Doe",
  "customerPhone": "+254712345678",
  "startGps": "-1.2921,36.8219",
  "startTime": "2024-07-20T10:00:00Z",
  "purpose": "Airport Transfer",
  "notes": "VIP customer, handle with care"
}
```

### **Get All Trips**

```
GET /fleet/trips
```

### **Get Trip Statistics**

```
GET /fleet/trips/stats
```

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Trip statistics fetched successfully."
  },
  "data": {
    "totalTrips": 150,
    "completedTrips": 120,
    "totalRevenue": 45000.5,
    "averageRating": 4.2,
    "completionRate": 80.0
  }
}
```

### **Get Single Trip**

```
GET /fleet/trips/:id
```

### **Get Driver's Trips**

```
GET /fleet/trips/driver/:driverId
```

### **Get Vehicle's Trips**

```
GET /fleet/trips/vehicle/:vehicleId
```

### **Start Trip**

```
PUT /fleet/trips/:id/start
```

**Description:** Changes trip status to IN_PROGRESS and records actual start time.

### **End Trip**

```
PUT /fleet/trips/:id/end
```

**Sample Request:**

```json
{
  "endTime": "2024-07-20T11:30:00Z",
  "endGps": "-1.3191,36.9277",
  "customerPhone": "+254712345678",
  "customerName": "John Doe",
  "distance": 25.5,
  "paymentStatus": "PAID",
  "paymentMethod": "CASH",
  "fuelConsumption": 3.2,
  "fuelCost": 480.0,
  "rating": 5,
  "feedback": "Excellent service, very professional driver"
}
```

### **Update Trip**

```
PUT /fleet/trips/:id
```

### **Delete Trip**

```
DELETE /fleet/trips/:id
```

## Trip Workflow

### **1. Trip Creation**

```bash
# Create a new trip
curl -X POST http://localhost:3000/fleet/trips \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": 1,
    "driverId": 1,
    "startGps": "-1.2921,36.8219",
    "startTime": "2024-07-20T10:00:00Z",
    "purpose": "Airport Transfer"
  }'
```

### **2. Start Trip**

```bash
# Start the trip (changes status to IN_PROGRESS)
curl -X PUT http://localhost:3000/fleet/trips/1/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **3. End Trip**

```bash
# End the trip with complete details
curl -X PUT http://localhost:3000/fleet/trips/1/end \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endTime": "2024-07-20T11:30:00Z",
    "distance": 25.5,
    "customerPhone": "+254712345678",
    "paymentStatus": "PAID",
    "rating": 5
  }'
```

## Automatic Calculations

### **Price Calculation**

The system automatically calculates trip costs:

```
Total Price = Distance (km) × Price per km (from vehicle)
```

**Example:**

- Distance: 25.5 km
- Vehicle price per km: $2.50
- Total Price: 25.5 × $2.50 = $63.75

### **Price Per Km Capture**

When creating a trip, the system:

1. Fetches the vehicle's current `pricePerKm`
2. Stores it in the trip record
3. Uses this value for calculations even if vehicle pricing changes later

## GPS Coordinates Format

GPS coordinates should be provided in the format:

```
"latitude,longitude"
```

**Examples:**

- `"-1.2921,36.8219"` (Nairobi CBD)
- `"-1.3191,36.9277"` (Jomo Kenyatta Airport)

## Customer Information

### **Required at Trip End:**

- `customerPhone` - For contact and billing
- `endTime` - When trip actually ended

### **Optional:**

- `customerName` - For better record keeping
- `rating` - Customer satisfaction (1-5 stars)
- `feedback` - Customer comments

## Payment Tracking

### **Payment Status Updates:**

- `PENDING` - Default when trip ends
- `PAID` - Full payment received
- `PARTIAL` - Partial payment received
- `REFUNDED` - Payment refunded
- `CANCELLED` - Payment cancelled

### **Payment Methods:**

- `CASH`
- `MPESA`
- `CARD`
- `BANK_TRANSFER`
- `OTHER`

## Fuel Tracking

### **Optional Fields:**

- `fuelConsumption` - Liters of fuel used
- `fuelCost` - Cost of fuel consumed

**Use Case:** Track fuel efficiency and costs per trip for better fleet management.

## Trip Statistics

### **Available Metrics:**

- Total trips created
- Completed trips count
- Total revenue generated
- Average customer rating
- Trip completion rate

### **Usage:**

```bash
curl -X GET http://localhost:3000/fleet/trips/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Error Handling

### **Common Errors:**

1. **Vehicle not found** - Returns 404 if vehicleId doesn't exist
2. **Driver not found** - Returns 404 if driverId doesn't exist
3. **Invalid status transition** - Prevents invalid status changes
4. **Missing required fields** - Returns 400 for validation errors

## Best Practices

### **Trip Creation:**

1. Always provide accurate start and end locations
2. Include GPS coordinates when possible
3. Set realistic start times
4. Add relevant notes for special requirements

### **Trip Management:**

1. Start trips promptly when they begin
2. Record accurate end times and distances
3. Capture customer feedback for service improvement
4. Update payment status promptly

### **Data Integrity:**

1. Price per km is captured at trip start to prevent changes
2. All timestamps are recorded in UTC
3. GPS coordinates are validated for format
4. Customer phone numbers are validated

## Integration Examples

### **Mobile App Integration:**

```javascript
// Start trip when driver begins
const startTrip = async (tripId) => {
  const response = await fetch(`/fleet/trips/${tripId}/start`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

// End trip with GPS coordinates
const endTrip = async (tripId, endData) => {
  const response = await fetch(`/fleet/trips/${tripId}/end`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(endData),
  });
  return response.json();
};
```

### **Dashboard Integration:**

```javascript
// Get trip statistics for dashboard
const getTripStats = async () => {
  const response = await fetch('/fleet/trips/stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};
```

This comprehensive trip management system provides everything needed for efficient fleet operations with detailed tracking, automatic calculations, and comprehensive reporting capabilities.
