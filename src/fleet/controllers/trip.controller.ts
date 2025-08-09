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
import { TripService } from '../services/trip.service';
import { CreateTripDto } from '../dtos/create-trip.dto';
import { EndTripDto } from '../dtos/end-trip.dto';

@Controller('fleet/trips')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  //@Permissions('can_create_trip')
  async create(@Body() data: CreateTripDto) {
    return this.tripService.create(data);
  }

  @Get()
  //@Permissions('can_view_trips')
  async findAll() {
    return this.tripService.findAll();
  }

  @Get('stats')
  //@Permissions('can_view_trips')
  async getStats() {
    return this.tripService.getTripStats();
  }

  @Get(':id')
  //@Permissions('can_view_trips')
  async findOne(@Param('id') id: string) {
    return this.tripService.findOne(Number(id));
  }

  @Get('driver/:driverId')
  //@Permissions('can_view_trips')
  async findByDriver(@Param('driverId') driverId: string) {
    return this.tripService.findByDriver(Number(driverId));
  }

  @Get('vehicle/:vehicleId')
  //@Permissions('can_view_trips')
  async findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.tripService.findByVehicle(Number(vehicleId));
  }

  @Put(':id/start')
  //@Permissions('can_update_trip')
  async startTrip(@Param('id') id: string) {
    return this.tripService.startTrip(Number(id));
  }

  @Put(':id/end')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  //@Permissions('can_update_trip')
  async endTrip(@Param('id') id: string, @Body() data: EndTripDto) {
    return this.tripService.endTrip(Number(id), data);
  }

  @Put(':id')
  //@Permissions('can_update_trip')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.tripService.update(Number(id), data);
  }

  @Delete(':id')
  //@Permissions('can_delete_trip')
  async delete(@Param('id') id: string) {
    return this.tripService.delete(Number(id));
  }
}
