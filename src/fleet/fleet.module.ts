import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { FleetController } from './controllers/fleet.controller';
import { FleetService } from './services/fleet.service';
import { VehicleController } from './controllers/vehicle.controller';
import { VehicleService } from './services/vehicle.service';
import { DriverController } from './controllers/driver.controller';
import { DriverService } from './services/driver.service';
import { MaintenanceController } from './controllers/maintenance.controller';
import { MaintenanceService } from './services/maintenance.service';
import { TripController } from './controllers/trip.controller';
import { TripService } from './services/trip.service';
import { FileUploadService } from './services/file-upload.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    FleetController,
    VehicleController,
    DriverController,
    MaintenanceController,
    TripController,
  ],
  providers: [
    CommonFunctionsService,
    FleetService,
    VehicleService,
    DriverService,
    MaintenanceService,
    TripService,
    FileUploadService,
  ],
})
export class FleetModule {}
