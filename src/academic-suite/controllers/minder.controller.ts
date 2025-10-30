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
import { CreateMinderDto, UpdateMinderDto } from '../dto/create-minder.dto';
import { MinderDbService } from '../services/minder-db.service';
import { FileUploadService } from '../../jf/services/file-upload.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('academic-suite/minders')
export class MinderController {
  private readonly logger = new Logger(MinderController.name);

  constructor(
    private readonly minderDb: MinderDbService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo'))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Body() dto: CreateMinderDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Creating new minder: ${dto.name}`);
      // If a photo file is provided (multipart form-data), save it
      if (photo) {
        const photoPath = await this.fileUploadService.saveFile(
          photo,
          'minders',
          `minder_${Date.now()}`,
        );
        dto.photo = photoPath;
      }

      const created = await this.minderDb.create(dto);
      return { success: true, data: created };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create minder',
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
        'Fetching all minders with pagination and optional schoolId filter',
      );
      const pageNum = Number(page) || 1;
      const pageSizeNum = Number(pageSize) || 10;
      const result = await this.minderDb.findAll(
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
          error instanceof Error ? error.message : 'Failed to fetch minders',
      };
    }
  }

  @Get('statistics')
  async getStatistics() {
    try {
      this.logger.debug('Fetching minder statistics');
      const statistics = await this.minderDb.getMinderStatistics();
      return { success: true, data: statistics };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch minder statistics',
      };
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching minder with ID: ${id}`);
      const minder = await this.minderDb.findById(id);
      if (!minder) {
        return { success: false, message: 'Minder not found' };
      }
      return { success: true, data: minder };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch minder',
      };
    }
  }

  @Get('pin/:pin')
  async getByPin(@Param('pin') pin: string) {
    try {
      this.logger.log(`Fetching minder with PIN: ${pin}`);
      const minder = await this.minderDb.findByPin(pin);
      if (!minder) {
        return { success: false, message: 'Minder not found' };
      }
      return { success: true, data: minder };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch minder',
      };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateMinderDto) {
    try {
      this.logger.log(`Updating minder with ID: ${id}`);

      // Check if minder exists
      const existingMinder = await this.minderDb.findById(id);
      if (!existingMinder) {
        return { success: false, error: 'Minder not found' };
      }

      const updated = await this.minderDb.update(id, dto);
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update minder',
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
      this.logger.log(`Updating minder photo with ID: ${id}`);

      // Check if minder exists
      const existingMinder = await this.minderDb.findById(id);
      if (!existingMinder) {
        return { success: false, error: 'Minder not found' };
      }

      // Handle photo upload
      if (photo) {
        const photoPath = await this.fileUploadService.saveFile(
          photo,
          'minders',
          `minder_${Date.now()}`,
        );

        const updated = await this.minderDb.update(id, { photo: photoPath });
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
            : 'Failed to update minder photo',
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting minder with ID: ${id}`);

      // Check if minder exists
      const existingMinder = await this.minderDb.findById(id);
      if (!existingMinder) {
        return { success: false, error: 'Minder not found' };
      }

      const deleted = await this.minderDb.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete minder',
      };
    }
  }
}
