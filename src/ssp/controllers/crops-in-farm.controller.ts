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
import { CropsInFarmService } from '../services/crops-in-farm.service';
import { CreateCropInFarmDto } from '../dtos/create-crop-in-farm.dto';

@Controller('crops-in-farm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CropsInFarmController {
  constructor(private readonly service: CropsInFarmService) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Permissions('can_create_county')
  async create(@Body() data: CreateCropInFarmDto) {
    const response = this.service.create(data);
    return response;
  }

  @Get('crops/:id')
  @Permissions('can_view_counties')
  async findAllCropsInFarm(@Param('id') id: string) {
    return this.service.findAllCropsInFarm(Number(id));
  }

  @Get()
  @Permissions('can_view_counties')
  async findAll(@Request() req) {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    return this.service.findAll(page, pageSize);
  }

  @Get(':id')
  @Permissions('can_view_counties')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  @Permissions('can_update_county')
  async update(@Param('id') id: string, @Body() data: Prisma.PestCreateInput) {
    return this.service.update(Number(id), data);
  }

  @Delete(':id')
  @Permissions('can_delete_county')
  async delete(@Param('id') id: string) {
    return this.service.delete(Number(id));
  }
}
