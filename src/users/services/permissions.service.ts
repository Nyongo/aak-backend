import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Permission } from '@prisma/client';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async create(createRoleDto: any) {
    try {
      const newRecord = await this.prisma.permission.create({
        data: {
          name: createRoleDto.name,
        },
        select: {
          id: true,
          name: true,
        },
      });
      if (newRecord)
        return this.commonFunctions.returnFormattedResponse(
          200,
          'Created Successfully',
          newRecord,
        );
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        // Handle specific error types
        if (e.code === 'P2002') {
          // Unique constraint violation
          return this.commonFunctions.returnFormattedResponse(
            400,
            `The role ${createRoleDto.name} already exists.`,
            null,
          );
        }
        // Handle other Prisma errors as needed
        return this.commonFunctions.returnFormattedResponse(
          500,
          `An error occurred: ${e.message}`,
          null,
        );
      }

      // Handle unknown errors
      console.error('Unknown error:', e);
      return {
        statusCode: 500,
        message: 'Internal server error.',
      };
    }
  }

  // Get user roles and permissions
  async findOne(id: number): Promise<any> {
    try {
      const user = await this.prisma.permission.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
        },
      });
      if (!user) {
        return this.commonFunctions.returnFormattedResponse(
          404,
          'No record found',
          null,
        );
      }
      return this.commonFunctions.returnFormattedResponse(
        200,
        'Retrieved Successfully',
        user,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      console.error('Unknown error in update user:', error);
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  // Update user details
  async update(id: number, updateUserDto: any): Promise<any> {
    try {
      // Only allow updates to name, roleId (excluding email and password)
      const { name } = updateUserDto;

      // Proceed with the update, excluding sensitive fields
      const updatedUser = await this.prisma.role.update({
        where: { id },
        data: updateUserDto,
      });

      return this.commonFunctions.returnFormattedResponse(
        200,
        'Permission updated successfully',
        updatedUser,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      console.error('Unknown error in update user:', error);
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  // Assign roles to a user
  async assignRoleToUser(userId: number, roleId: number): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        role: { connect: { id: roleId } },
      },
    });
  }

  async findAll(page: number = 1, pageSize: number = 10) {
    try {
      const skip = (page - 1) * pageSize;
      const take = pageSize;
      const [data, totalItems] = await Promise.all([
        this.prisma.permission.findMany({
          skip,
          take,
        }),
        this.prisma.permission.count(),
      ]);

      const totalPages = Math.ceil(totalItems / pageSize);

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fetched Permissions',
        {
          data,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            pageSize,
          },
        },
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findPermissionsByRole(roleId: number) {
    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }
  // Get permissions of a specific role
  async findRolePermissions(roleId: number): Promise<Permission[]> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return role?.permissions.map((rp) => rp.permission) || [];
  }

  async addPermissionToRole(roleId: number, permissionId: number) {
    // Check if the role exists
    const roleExists = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!roleExists) {
      throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
    }

    // Check if the permission exists
    const permissionExists = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permissionExists) {
      throw new HttpException('Permission not found', HttpStatus.NOT_FOUND);
    }

    // Check if the permission is already assigned to the role
    const existingRolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });
    if (existingRolePermission) {
      throw new HttpException(
        'Permission already assigned to this role',
        HttpStatus.CONFLICT,
      );
    }

    // Create the role-permission association
    return this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
  }

  async removePermissionFromRole(roleId: number, permissionId: number) {
    // Check if the role-permission association exists
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });
    if (!rolePermission) {
      throw new HttpException(
        'Permission not assigned to this role',
        HttpStatus.NOT_FOUND,
      );
    }

    // Delete the association
    return this.prisma.rolePermission.delete({
      where: {
        id: rolePermission.id,
      },
    });
  }

  async findAssignedPermissions(roleId: number) {
    const assignedPermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    });
    const permissions = assignedPermissions.map((rec) => rec.permission);
    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Fetched Permissions',
      permissions,
    );
  }

  async findUnassignedPermissions(roleId: number) {
    // Get all permissions
    const allPermissions = await this.prisma.permission.findMany();

    // Get permissions already assigned to the role
    const assignedPermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });

    // Extract assigned permission IDs
    const assignedPermissionIds = assignedPermissions.map(
      (p) => p.permissionId,
    );

    // Filter out assigned permissions
    const unassignedPermissions = allPermissions.filter(
      (permission) => !assignedPermissionIds.includes(permission.id),
    );

    // return unassignedPermissions;

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Fetched Permissions',
      unassignedPermissions,
    );
  }

  async findUnassignedUsers(roleId: number) {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [{ roleId: null }, { NOT: { roleId } }], // Include users with roleId = null
      },
      select: { id: true, name: true },
    });

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Fetched Users',
      users,
    );
  }

  async findAssignedUsers(roleId: number) {
    const users = await this.prisma.user.findMany({
      where: { roleId },
      select: { id: true, name: true },
    });

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Fetched Users',
      users,
    );
  }

  async bulkAssignPermissions(roleId: number, permissionIds: number[]) {
    // Ensure all permissionIds are valid
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    const validPermissionIds = permissions.map((p) => p.id);

    if (validPermissionIds.length !== permissionIds.length) {
      throw new Error('Some permissions do not exist.');
    }

    // Create new RolePermission records for the permissions
    const data = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          create: validPermissionIds.map((id) => ({ permissionId: id })),
        },
      },
    });

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Assigned Permissions successfully',
      data,
    );
  }

  async bulkRemovePermissions(roleId: number, permissionIds: number[]) {
    const data = await this.prisma.$transaction(
      permissionIds.map((permissionId) =>
        this.prisma.rolePermission.deleteMany({
          where: { roleId, permissionId },
        }),
      ),
    );

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Removed Permissions successfully',
      data,
    );
  }

  async bulkAssignUsers(roleId: number, userIds: number[]) {
    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { roleId },
    });

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Users successfully assigned to the role',
      [],
    );
  }

  async bulkUnassignUsers(userIds: number[]) {
    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { roleId: null },
    });

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Users successfully unassigned from the role',
      [],
    );
  }
}
