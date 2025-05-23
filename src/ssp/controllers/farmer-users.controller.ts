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
import { FarmerUsersService } from '../services/farmer-users.service';
import { CreateFarmerUserDto } from '../dtos/create-farmer-user.dto';

@Controller('farmer-users')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FaremerUsersController {
  constructor(private readonly service: FarmerUsersService) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Permissions('can_create_county')
  async create(@Body() data: CreateFarmerUserDto) {
    const response = this.service.create(data);
    return response;
  }

  @Get()
  @Permissions('can_view_counties')
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req) {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    return this.service.findAll(page, pageSize);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('can_view_counties')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('can_update_county')
  async update(@Param('id') id: string, @Body() data: Prisma.PestCreateInput) {
    return this.service.update(Number(id), data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Permissions('can_delete_county')
  async delete(@Param('id') id: string) {
    return this.service.delete(Number(id));
  }

  @Get(':id/farms')
  @UseGuards(JwtAuthGuard)
  @Permissions('can_view_counties')
  async findFarmerFarms(@Param('id') id: string) {
    return this.service.findFarmerFarms(Number(id));
  }
}
