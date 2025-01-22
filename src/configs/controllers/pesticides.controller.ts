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
import { PesticidesService } from '../services/pesticides.service';
import { CreatePesticideDto } from '../dto/create-pesticide.dto';

@Controller('pesticides')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PesticidesController {
  constructor(private readonly service: PesticidesService) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Permissions('can_create_pesticide')
  async create(@Body() data: CreatePesticideDto) {
    const response = this.service.create(data);
    return response;
  }

  @Get()
  @Permissions('can_view_pesticides')
  async findAll(@Request() req) {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    return this.service.findAll(page, pageSize);
  }

  @Get(':id')
  @Permissions('can_view_pesticides')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  @Permissions('can_update_pesticides')
  async update(
    @Param('id') id: string,
    @Body() data: Prisma.PesticideCreateInput,
  ) {
    return this.service.update(Number(id), data);
  }

  @Delete(':id')
  @Permissions('can_delete_pesticides')
  async delete(@Param('id') id: string) {
    return this.service.delete(Number(id));
  }
}
