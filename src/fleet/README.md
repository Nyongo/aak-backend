# Fleet Management Module

This module provides comprehensive fleet management functionality for the NestJS application.

## Features

- **Vehicle Management**: CRUD operations for fleet vehicles
- **Driver Management**: CRUD operations for fleet drivers
- **Maintenance Tracking**: Schedule and track vehicle maintenance
- **Fleet Dashboard**: Overview and statistics for fleet operations

## Models

### Vehicle

- Basic vehicle information (make, model, license plate, VIN)
- Vehicle status and registration details
- Maintenance history and trip records

### Driver

- Driver personal information and contact details
- License information and expiry tracking
- Emergency contact information

### Maintenance

- Scheduled and completed maintenance records
- Cost tracking and service provider information
- Vehicle-specific maintenance history

### Trip

- Trip scheduling and tracking
- Vehicle and driver assignments
- Trip status and completion tracking

## API Endpoints

### Fleet Dashboard

- `GET /fleet/dashboard` - Get fleet statistics and overview
- `GET /fleet/overview` - Get recent fleet activities

### Vehicles

- `GET /fleet/vehicles` - Get all vehicles
- `GET /fleet/vehicles/:id` - Get specific vehicle
- `POST /fleet/vehicles` - Create new vehicle
- `PUT /fleet/vehicles/:id` - Update vehicle
- `DELETE /fleet/vehicles/:id` - Delete vehicle

### Drivers

- `GET /fleet/drivers` - Get all drivers
- `GET /fleet/drivers/:id` - Get specific driver
- `POST /fleet/drivers` - Create new driver
- `PUT /fleet/drivers/:id` - Update driver
- `DELETE /fleet/drivers/:id` - Delete driver

### Maintenance

- `GET /fleet/maintenance` - Get all maintenance records
- `GET /fleet/maintenance/:id` - Get specific maintenance record
- `GET /fleet/maintenance/vehicle/:vehicleId` - Get maintenance for specific vehicle
- `POST /fleet/maintenance` - Create new maintenance record
- `PUT /fleet/maintenance/:id` - Update maintenance record
- `DELETE /fleet/maintenance/:id` - Delete maintenance record

## Permissions

The following permissions are required for different operations:

- `can_view_fleet` - View fleet dashboard and overview
- `can_view_vehicles` - View vehicle information
- `can_create_vehicle` - Create new vehicles
- `can_update_vehicle` - Update vehicle information
- `can_delete_vehicle` - Delete vehicles
- `can_view_drivers` - View driver information
- `can_create_driver` - Create new drivers
- `can_update_driver` - Update driver information
- `can_delete_driver` - Delete drivers
- `can_view_maintenance` - View maintenance records
- `can_create_maintenance` - Create maintenance records
- `can_update_maintenance` - Update maintenance records
- `can_delete_maintenance` - Delete maintenance records

## Database Schema

The fleet module uses the following database tables:

- `Vehicle` - Vehicle information
- `Driver` - Driver information
- `Maintenance` - Maintenance records
- `Trip` - Trip records

All tables include standard audit fields (createdAt, lastUpdatedAt, createdById, lastUpdatedById) for tracking changes.
