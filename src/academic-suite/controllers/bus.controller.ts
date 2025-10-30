import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateBusDto, UpdateBusDto } from '../dto/create-bus.dto';
import { BusDbService } from '../services/bus-db.service';

@Controller('academic-suite/buses')
export class BusController {
  constructor(private readonly busDb: BusDbService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() dto: CreateBusDto) {
    try {
      // Check if registration number already exists
      const existingBus = await this.busDb.findByRegistrationNumber(
        dto.registrationNumber,
      );
      if (existingBus) {
        return {
          success: false,
          error: 'Bus with this registration number already exists',
        };
      }

      const created = await this.busDb.create(dto);
      return { success: true, data: created };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create bus',
      };
    }
  }

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('schoolId') schoolId?: string,
  ) {
    try {
      const p = Number(page) || 1;
      const ps = Number(pageSize) || 10;
      const result = await this.busDb.findAll(p, ps, schoolId);
      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch buses',
      };
    }
  }

  @Get('statistics')
  async getStatistics() {
    try {
      const statistics = await this.busDb.getBusStatistics();
      return { success: true, data: statistics };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch bus statistics',
      };
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    try {
      const bus = await this.busDb.findById(id);
      if (!bus) {
        return { success: false, message: 'Bus not found' };
      }
      return { success: true, data: bus };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bus',
      };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateBusDto) {
    try {
      // Check if bus exists
      const existingBus = await this.busDb.findById(id);
      if (!existingBus) {
        return { success: false, error: 'Bus not found' };
      }

      // Check if registration number is being changed and already exists
      if (
        dto.registrationNumber &&
        dto.registrationNumber !== existingBus.registrationNumber
      ) {
        const busWithSameReg = await this.busDb.findByRegistrationNumber(
          dto.registrationNumber,
        );
        if (busWithSameReg) {
          return {
            success: false,
            error: 'Bus with this registration number already exists',
          };
        }
      }

      const updated = await this.busDb.update(id, dto);
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update bus',
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const existingBus = await this.busDb.findById(id);
      if (!existingBus) {
        return { success: false, error: 'Bus not found' };
      }

      const deleted = await this.busDb.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete bus',
      };
    }
  }
}
