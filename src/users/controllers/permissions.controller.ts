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
  Delete,
  Patch,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsService } from '../services/permissions.service';

@Controller('permissions')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermisssionsController {
  constructor(private readonly service: PermissionsService) {}

  @Post()
  @HttpCode(200)
  // @Permissions('can_create_role')
  async create(@Body() data: Prisma.RoleCreateInput) {
    return this.service.create(data);
  }

  @Get()
  // @Permissions('can_view_roles')
  async findAll(@Request() req) {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    return this.service.findAll(page, pageSize);
  }

  // findPermissionsInRole

  @Get(':id')
  // @Permissions('can_view_roles')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Get(':id/permissions')
  // @Permissions('can_view_role_permissions')
  async findPermissionsByRole(@Param('id') id: string) {
    return this.service.findAssignedPermissions(Number(id));
  }

  @Get(':id/unassigned-permissions')
  // @Permissions('can_view_role_permissions')
  async findUnassignedPermissions(@Param('id') roleId: string) {
    return this.service.findUnassignedPermissions(Number(roleId));
  }

  @Get(':id/assigned-users')
  // @Permissions('can_view_role_permissions')
  async findAssignedPermissions(@Param('id') roleId: string) {
    return this.service.findAssignedUsers(Number(roleId));
  }

  @Get(':id/unassigned-users')
  // @Permissions('can_view_role_permissions')
  async findUnassignedUsers(@Param('id') roleId: string) {
    return this.service.findUnassignedUsers(Number(roleId));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Prisma.UserUpdateInput) {
    return this.service.update(Number(id), data);
  }

  @Put(':id/permissions')
  @HttpCode(200)
  // @Permissions('can_add_role_permissions')
  async addPermissionToRole(
    @Param('id') roleId: string,
    @Body() data: { permissionId: number },
  ) {
    return this.service.addPermissionToRole(Number(roleId), data.permissionId);
  }

  @Delete(':id/permissions')
  @HttpCode(200)
  // @Permissions('can_remove_role_permissions') // Optional: Use a permissions guard
  async removePermissionFromRole(
    @Param('id') roleId: string,
    @Body() data: { permissionId: number },
  ) {
    return this.service.removePermissionFromRole(
      Number(roleId),
      data.permissionId,
    );
  }

  @Post(':id/permissions/bulk')
  @HttpCode(200)
  // @Permissions('can_add_role_permissions')
  async bulkAssignPermissions(
    @Param('id') roleId: string,
    @Body() data: { permissionIds: number[] },
  ) {
    return this.service.bulkAssignPermissions(
      Number(roleId),
      data.permissionIds,
    );
  }

  @Delete(':id/permissions/bulk')
  @HttpCode(200)
  // @Permissions('can_remove_role_permissions')
  async bulkRemovePermissions(
    @Param('id') roleId: string,
    @Body() data: { permissionIds: number[] },
  ) {
    return this.service.bulkRemovePermissions(
      Number(roleId),
      data.permissionIds,
    );
  }

  @Delete(':id/permissions/bulk-detach-users')
  @HttpCode(200)
  // @Permissions('can_remove_role_permissions')
  async bulkRemoveUsers(
    @Param('id') roleId: string,
    @Body() data: { usersIds: number[] },
  ) {
    console.log('hrrr');
    return this.service.bulkUnassignUsers(data.usersIds);
  }

  @Patch(':id/permissions/bulk-assign-users')
  @HttpCode(200)
  // @Permissions('can_remove_role_permissions')
  async bulkAssignUsers(
    @Param('id') roleId: string,
    @Body() data: { usersIds: number[] },
  ) {
    return this.service.bulkAssignUsers(Number(roleId), data.usersIds);
  }
}
