import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  HttpCode,
  Request,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { Prisma } from '@prisma/client';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { ChangePasswordDto } from '../dtos/change-password.dto';

@Controller('users')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(200)
  // @Permissions('can_create_user')
  async create(@Body() data: Prisma.UserCreateInput) {
    return this.usersService.create(data);
  }

  @Get()
  @Permissions('can_view_users')
  async findAll(@Request() req) {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    return this.usersService.findAll(page, pageSize);
  }
  @Get(':id')
  @Permissions('can_view_users')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(Number(id));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Prisma.UserUpdateInput) {
    return this.usersService.update(Number(id), data);
  }

  @Post('change-password')
  async changePassword(@Body() dto: any) {
    return this.usersService.changePassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: any) {
    return this.usersService.resetPassword(dto.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() data: any) {
    return this.usersService.update(req.user.id, data);
  }
}
