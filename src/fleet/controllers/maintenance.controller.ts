import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
} from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { MaintenanceService } from '../services/maintenance.service';
import { CreateMaintenanceDto } from '../dtos/create-maintenance.dto';

@Controller('fleet/maintenance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Permissions('can_create_maintenance')
  async create(@Body() data: CreateMaintenanceDto) {
    return this.maintenanceService.create(data);
  }

  @Get()
  @Permissions('can_view_maintenance')
  async findAll() {
    return this.maintenanceService.findAll();
  }

  @Get(':id')
  @Permissions('can_view_maintenance')
  async findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(Number(id));
  }

  @Get('vehicle/:vehicleId')
  @Permissions('can_view_maintenance')
  async findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.maintenanceService.findByVehicle(Number(vehicleId));
  }

  @Put(':id')
  @Permissions('can_update_maintenance')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.maintenanceService.update(Number(id), data);
  }

  @Delete(':id')
  @Permissions('can_delete_maintenance')
  async delete(@Param('id') id: string) {
    return this.maintenanceService.delete(Number(id));
  }
}
