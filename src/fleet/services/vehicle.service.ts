import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateVehicleDto } from '../dtos/create-vehicle.dto';
import { UpdateVehicleDto } from '../dtos/update-vehicle.dto';

@Injectable()
export class VehicleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async create(createDto: CreateVehicleDto) {
    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          make: createDto.make,
          model: createDto.model,
          licensePlate: createDto.licensePlate,
          vin: createDto.vin,
          year: createDto.year,
          color: createDto.color,
          fuelType: createDto.fuelType,
          mileage: createDto.mileage,
          averageFuelConsumption: createDto.averageFuelConsumption,
          pricePerKm: createDto.pricePerKm,
          registrationExpiry: createDto.registrationExpiry
            ? new Date(createDto.registrationExpiry)
            : null,
          isActive: createDto.isActive ?? true,
          notes: createDto.notes,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Vehicle created successfully.',
        vehicle,
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
      const vehicles = await this.prisma.vehicle.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Vehicles fetched successfully.',
        vehicles,
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
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id },
      });

      if (!vehicle) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Vehicle not found.',
          null,
        );
      }

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Vehicle fetched successfully.',
        vehicle,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(id: number, updateDto: UpdateVehicleDto) {
    try {
      // Prepare update data with proper field handling
      const updateData: any = {};

      if (updateDto.make !== undefined) updateData.make = updateDto.make;
      if (updateDto.model !== undefined) updateData.model = updateDto.model;
      if (updateDto.licensePlate !== undefined)
        updateData.licensePlate = updateDto.licensePlate;
      if (updateDto.vin !== undefined) updateData.vin = updateDto.vin;
      if (updateDto.year !== undefined) updateData.year = updateDto.year;
      if (updateDto.color !== undefined) updateData.color = updateDto.color;
      if (updateDto.fuelType !== undefined)
        updateData.fuelType = updateDto.fuelType;
      if (updateDto.mileage !== undefined)
        updateData.mileage = updateDto.mileage;
      if (updateDto.averageFuelConsumption !== undefined)
        updateData.averageFuelConsumption = updateDto.averageFuelConsumption;
      if (updateDto.pricePerKm !== undefined)
        updateData.pricePerKm = updateDto.pricePerKm;
      if (updateDto.registrationExpiry !== undefined) {
        updateData.registrationExpiry = updateDto.registrationExpiry
          ? new Date(updateDto.registrationExpiry)
          : null;
      }
      if (updateDto.isActive !== undefined)
        updateData.isActive = updateDto.isActive;
      if (updateDto.notes !== undefined) updateData.notes = updateDto.notes;

      const vehicle = await this.prisma.vehicle.update({
        where: { id },
        data: updateData,
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Vehicle updated successfully.',
        vehicle,
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
      await this.prisma.vehicle.delete({
        where: { id },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Vehicle deleted successfully.',
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
