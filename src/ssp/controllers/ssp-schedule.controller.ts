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
  Request,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { CreateCropInFarmDto } from '../dtos/create-crop-in-farm.dto';
import { SspScheduleService } from '../services/ssp-schedule.service';
import { GenerateSspScheduleDto } from '../dtos/generate-ssp-schedule.dto';

@Controller('ssp-schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SspScheduleController {
  constructor(private readonly service: SspScheduleService) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  // @Permissions('can_create_county')
  async create(@Body() data: GenerateSspScheduleDto) {
    const response = this.service.generateSlots(
      data.sspId,
      data.startHour,
      data.endHour,
      data.duration,
    );
    return response;
  }

  @Get('ssp/:id')
  // @Permissions('can_view_counties')
  async findAllCropsInFarm(@Param('id') id: string) {
    return this.service.findAllSspSchedules(Number(id));
  }

  @Get(':id')
  // @Permissions('can_view_counties')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  // @Permissions('can_update_county')
  async update(@Param('id') id: string, @Body() data: Prisma.PestCreateInput) {
    return this.service.update(Number(id), data);
  }

  @Delete(':id')
  //@Permissions('can_delete_county')
  async delete(@Param('id') id: string) {
    return this.service.delete(Number(id));
  }
}
