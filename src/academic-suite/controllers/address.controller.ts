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
} from '@nestjs/common';
import { CreateAddressDto, UpdateAddressDto } from '../dto/create-address.dto';
import { AddressDbService } from '../services/address-db.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('academic-suite/addresses')
export class AddressController {
  private readonly logger = new Logger(AddressController.name);

  constructor(private readonly addressDb: AddressDbService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() dto: CreateAddressDto) {
    try {
      this.logger.log(
        `Creating new address for parent: ${dto.parentId}`,
      );
      const created = await this.addressDb.create(dto);
      return { success: true, data: created };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create address',
      };
    }
  }

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('parentId') parentId?: string,
  ) {
    try {
      this.logger.debug(
        'Fetching all addresses with pagination and optional parentId filter',
      );
      const pageNum = Number(page) || 1;
      const pageSizeNum = Number(pageSize) || 10;
      const result = await this.addressDb.findAll(
        pageNum,
        pageSizeNum,
        parentId,
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
          error instanceof Error ? error.message : 'Failed to fetch addresses',
      };
    }
  }

  @Get('statistics')
  async getStatistics() {
    try {
      this.logger.debug('Fetching address statistics');
      const statistics = await this.addressDb.getAddressStatistics();
      return { success: true, data: statistics };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch address statistics',
      };
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching address with ID: ${id}`);
      const address = await this.addressDb.findById(id);
      if (!address) {
        return { success: false, message: 'Address not found' };
      }
      return { success: true, data: address };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch address',
      };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateAddressDto) {
    try {
      this.logger.log(`Updating address with ID: ${id}`);

      // Check if address exists
      const existingAddress = await this.addressDb.findById(id);
      if (!existingAddress) {
        return { success: false, error: 'Address not found' };
      }

      const updated = await this.addressDb.update(id, dto);
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update address',
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting address with ID: ${id}`);

      // Check if address exists
      const existingAddress = await this.addressDb.findById(id);
      if (!existingAddress) {
        return { success: false, error: 'Address not found' };
      }

      const deleted = await this.addressDb.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete address',
      };
    }
  }
}


