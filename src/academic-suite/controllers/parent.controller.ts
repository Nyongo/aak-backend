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
import { CreateParentDto, UpdateParentDto } from '../dto/create-parent.dto';
import { ParentDbService } from '../services/parent-db.service';

@Controller('academic-suite/parents')
export class ParentController {
  private readonly logger = new Logger(ParentController.name);

  constructor(private readonly parentDb: ParentDbService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() dto: CreateParentDto) {
    try {
      this.logger.log(`Creating new parent: ${dto.name}`);
      const created = await this.parentDb.create(dto);
      return { success: true, data: created };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create parent',
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
      this.logger.debug('Fetching parents with pagination and optional schoolId');
      const result = await this.parentDb.findAll(Number(page) || 1, Number(pageSize) || 10, schoolId);
      return { success: true, data: result.data, pagination: result.pagination };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch parents',
      };
    }
  }

  @Get('statistics')
  async stats() {
    try {
      const data = await this.parentDb.getStatistics();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch statistics',
      };
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    try {
      const parent = await this.parentDb.findById(id);
      if (!parent) return { success: false, message: 'Parent not found' };
      return { success: true, data: parent };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch parent' };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateParentDto) {
    try {
      const existing = await this.parentDb.findById(id);
      if (!existing) return { success: false, error: 'Parent not found' };
      const updated = await this.parentDb.update(id, dto);
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update parent' };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const existing = await this.parentDb.findById(id);
      if (!existing) return { success: false, error: 'Parent not found' };
      const deleted = await this.parentDb.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete parent' };
    }
  }
}
