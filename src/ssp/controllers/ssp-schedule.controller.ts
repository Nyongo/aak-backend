import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { SspScheduleService } from '../services/ssp-schedule.service';
import { GenerateSspScheduleDto } from '../dtos/generate-ssp-schedule.dto';

@Controller('ssp-schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SspScheduleController {
  constructor(private readonly service: SspScheduleService) {}

  // Fetch all schedules for an SSP with optional date filtering
  @Post('ssp/:id')
  async findAllSspSchedules(
    @Param('id') id: string,
    @Body() body: { startDate: string; endDate: string },
  ) {
    return this.service.getSchedules(Number(id), body.startDate, body.endDate);
  }

  // Generate new schedules
  @Post('generate')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async generateSchedule(@Body() dto: GenerateSspScheduleDto) {
    return this.service.generateSlots(
      dto.sspId,
      dto.startDate,
      dto.endDate,
      dto.startHour,
      dto.endHour,
      dto.duration,
    );
  }
}
