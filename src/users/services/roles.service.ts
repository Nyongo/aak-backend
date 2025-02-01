import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Permission } from '@prisma/client';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async create(createRoleDto: any) {
    try {
      const newRecord = await this.prisma.role.create({
        data: {
          name: createRoleDto.name,
          isActive: createRoleDto.isActive,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
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
      const user = await this.prisma.role.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          permissions: {
            include: {
              permission: true,
            },
          },
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
  async update(id: number, updateDataDto: any): Promise<any> {
    try {
      // Only allow updates to name, roleId (excluding email and password)
      const { name, isActive } = updateDataDto;

      // Proceed with the update, excluding sensitive fields
      const updatedUser = await this.prisma.role.update({
        where: { id },
        data: { name, isActive },
      });

      return this.commonFunctions.returnFormattedResponse(
        200,
        'Updated successfully',
        updatedUser,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      console.error('Unknown error in updating:', error);
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
        this.prisma.role.findMany({
          skip,
          take,
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
        }),
        this.prisma.role.count(),
      ]);

      const totalPages = Math.ceil(totalItems / pageSize);

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fetched Roles',
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
}
