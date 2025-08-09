import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateMaintenanceDto } from '../dtos/create-maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async create(createDto: CreateMaintenanceDto) {
    try {
      const maintenance = await this.prisma.maintenance.create({
        data: {
          vehicleId: createDto.vehicleId,
          maintenanceType: createDto.maintenanceType,
          description: createDto.description,
          scheduledDate: new Date(createDto.scheduledDate),
          completedDate: createDto.completedDate
            ? new Date(createDto.completedDate)
            : null,
          cost: createDto.cost,
          serviceProvider: createDto.serviceProvider,
          invoiceNumber: createDto.invoiceNumber,
          isCompleted: createDto.isCompleted ?? false,
          notes: createDto.notes,
          mileageAtService: createDto.mileageAtService,
        },
        include: {
          vehicle: true,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Maintenance record created successfully.',
        maintenance,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findAll() {
    try {
      const maintenances = await this.prisma.maintenance.findMany({
        include: {
          vehicle: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Maintenance records fetched successfully.',
        maintenances,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findOne(id: number) {
    try {
      const maintenance = await this.prisma.maintenance.findUnique({
        where: { id },
        include: {
          vehicle: true,
        },
      });

      if (!maintenance) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Maintenance record not found.',
          null,
        );
      }

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Maintenance record fetched successfully.',
        maintenance,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findByVehicle(vehicleId: number) {
    try {
      const maintenances = await this.prisma.maintenance.findMany({
        where: { vehicleId },
        include: {
          vehicle: true,
        },
        orderBy: { scheduledDate: 'desc' },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Vehicle maintenance records fetched successfully.',
        maintenances,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(id: number, updateDto: any) {
    try {
      const maintenance = await this.prisma.maintenance.update({
        where: { id },
        data: updateDto,
        include: {
          vehicle: true,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Maintenance record updated successfully.',
        maintenance,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async delete(id: number) {
    try {
      await this.prisma.maintenance.delete({
        where: { id },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Maintenance record deleted successfully.',
        null,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}
