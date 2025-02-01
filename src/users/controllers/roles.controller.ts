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
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { RolesService } from '../services/roles.service';

@Controller('roles')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Post()
  @HttpCode(200)
  // @Permissions('can_create_role')
  async create(@Body() data: any) {
    return this.service.create(data);
  }

  @Get()
  // @Permissions('can_view_roles')
  async findAll(@Request() req) {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    return this.service.findAll(page, pageSize);
  }
  @Get(':id')
  // @Permissions('can_view_roles')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Prisma.RoleUpdateInput) {
    return this.service.update(Number(id), data);
  }
}
