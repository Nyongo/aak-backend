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
import { VehicleService } from '../services/vehicle.service';
import { CreateVehicleDto } from '../dtos/create-vehicle.dto';

@Controller('fleet/vehicles')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  //@Permissions('can_create_vehicle')
  async create(@Body() data: CreateVehicleDto) {
    return this.vehicleService.create(data);
  }

  @Get()
  // @Permissions('can_view_vehicles')
  async findAll() {
    return this.vehicleService.findAll();
  }

  @Get(':id')
  //@Permissions('can_view_vehicles')
  async findOne(@Param('id') id: string) {
    return this.vehicleService.findOne(Number(id));
  }

  @Put(':id')
  // @Permissions('can_update_vehicle')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.vehicleService.update(Number(id), data);
  }

  @Delete(':id')
  // @Permissions('can_delete_vehicle')
  async delete(@Param('id') id: string) {
    return this.vehicleService.delete(Number(id));
  }
}
