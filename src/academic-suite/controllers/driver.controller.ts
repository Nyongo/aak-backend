import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Logger,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateDriverDto, UpdateDriverDto } from '../dto/create-driver.dto';
import { DriverDbService } from '../services/driver-db.service';
import { FileUploadService } from '../../jf/services/file-upload.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('academic-suite/drivers')
export class DriverController {
  private readonly logger = new Logger(DriverController.name);

  constructor(
    private readonly driverDb: DriverDbService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() dto: CreateDriverDto) {
    try {
      this.logger.log(`Creating new driver: ${dto.name}`);
      const created = await this.driverDb.create(dto);
      return { success: true, data: created };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create driver',
      };
    }
  }

  @Post('with-photo')
  @UseInterceptors(FileInterceptor('photo'))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createWithPhoto(
    @Body() dto: CreateDriverDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Creating new driver with photo: ${dto.name}`);

      // Handle photo upload if provided
      if (photo) {
        const photoPath = await this.fileUploadService.saveFile(
          photo,
          'drivers',
          `driver_${Date.now()}`,
        );
        dto.photo = photoPath;
      }

      const created = await this.driverDb.create(dto);
      return { success: true, data: created };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create driver',
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
      this.logger.debug(
        'Fetching all drivers with pagination and optional schoolId filter',
      );
      const pageNum = Number(page) || 1;
      const pageSizeNum = Number(pageSize) || 10;
      const result = await this.driverDb.findAll(
        pageNum,
        pageSizeNum,
        schoolId,
      );
      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch drivers',
      };
    }
  }

  @Get('statistics')
  async getStatistics() {
    try {
      this.logger.debug('Fetching driver statistics');
      const statistics = await this.driverDb.getDriverStatistics();
      return { success: true, data: statistics };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch driver statistics',
      };
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching driver with ID: ${id}`);
      const driver = await this.driverDb.findById(id);
      if (!driver) {
        return { success: false, message: 'Driver not found' };
      }
      return { success: true, data: driver };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch driver',
      };
    }
  }

  @Get('pin/:pin')
  async getByPin(@Param('pin') pin: string) {
    try {
      this.logger.log(`Fetching driver with PIN: ${pin}`);
      const driver = await this.driverDb.findByPin(pin);
      if (!driver) {
        return { success: false, message: 'Driver not found' };
      }
      return { success: true, data: driver };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch driver',
      };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    try {
      this.logger.log(`Updating driver with ID: ${id}`);

      // Check if driver exists
      const existingDriver = await this.driverDb.findById(id);
      if (!existingDriver) {
        return { success: false, error: 'Driver not found' };
      }

      const updated = await this.driverDb.update(id, dto);
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update driver',
      };
    }
  }

  @Put(':id/photo')
  @UseInterceptors(FileInterceptor('photo'))
  async updatePhoto(
    @Param('id') id: string,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating driver photo with ID: ${id}`);

      // Check if driver exists
      const existingDriver = await this.driverDb.findById(id);
      if (!existingDriver) {
        return { success: false, error: 'Driver not found' };
      }

      // Handle photo upload
      if (photo) {
        const photoPath = await this.fileUploadService.saveFile(
          photo,
          'drivers',
          `driver_${Date.now()}`,
        );

        const updated = await this.driverDb.update(id, { photo: photoPath });
        return { success: true, data: updated };
      } else {
        return { success: false, error: 'No photo provided' };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update driver photo',
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting driver with ID: ${id}`);

      // Check if driver exists
      const existingDriver = await this.driverDb.findById(id);
      if (!existingDriver) {
        return { success: false, error: 'Driver not found' };
      }

      const deleted = await this.driverDb.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete driver',
      };
    }
  }
}
