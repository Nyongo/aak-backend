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
      include: { permissions: true }, // Assuming a `permissions` relation exists
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
}
