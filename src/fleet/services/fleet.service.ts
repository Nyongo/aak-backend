import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';

@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async getDashboardStats() {
    try {
      const [
        totalVehicles,
        activeVehicles,
        totalDrivers,
        activeDrivers,
        pendingMaintenance,
        completedTrips,
      ] = await Promise.all([
        this.prisma.vehicle.count(),
        this.prisma.vehicle.count({ where: { isActive: true } }),
        this.prisma.driver.count(),
        this.prisma.driver.count({ where: { isActive: true } }),
        this.prisma.maintenance.count({ where: { isCompleted: false } }),
        this.prisma.trip.count({ where: { status: 'COMPLETED' } }),
      ]);

      const stats = {
        totalVehicles,
        activeVehicles,
        totalDrivers,
        activeDrivers,
        pendingMaintenance,
        completedTrips,
      };

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fleet dashboard stats fetched successfully.',
        stats,
      );
    } catch (error) {
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async getFleetOverview() {
    try {
      const [vehicles, drivers, maintenances, trips] = await Promise.all([
        this.prisma.vehicle.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.driver.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.maintenance.findMany({
          take: 5,
          include: { vehicle: true },
          orderBy: { scheduledDate: 'asc' },
          where: { isCompleted: false },
        }),
        this.prisma.trip.findMany({
          take: 5,
          include: { vehicle: true, driver: true },
          orderBy: { startTime: 'desc' },
        }),
      ]);

      const overview = {
        recentVehicles: vehicles,
        recentDrivers: drivers,
        upcomingMaintenance: maintenances,
        recentTrips: trips,
      };

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fleet overview fetched successfully.',
        overview,
      );
    } catch (error) {
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}
