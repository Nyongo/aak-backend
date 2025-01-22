import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Permission } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async create(createUserDto: any) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    try {
      const newUser = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          name: createUserDto.name,
          password: hashedPassword,
          roleId: createUserDto.roleId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: true,
        },
      });
      if (newUser)
        return this.commonFunctions.returnFormattedResponse(
          200,
          'Created Successfully',
          newUser,
        );
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        // Handle specific error types
        if (e.code === 'P2002') {
          // Unique constraint violation
          return this.commonFunctions.returnFormattedResponse(
            400,
            `The email ${createUserDto.email} is already in use.`,
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
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
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
  async update(id: number, updateUserDto: any): Promise<any> {
    try {
      // Only allow updates to name, roleId (excluding email and password)
      const { email, password, ...updateData } = updateUserDto;

      // Validate if the user is trying to update email or password
      if (email || password) {
        return this.commonFunctions.returnFormattedResponse(
          400,
          'Email and password cannot be updated.',
          null,
        );
      }

      // Proceed with the update, excluding sensitive fields
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: true,
          createdAt: true,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        200,
        'User updated successfully',
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

  // Get all users with their roles
  async findAll(page: number = 1, pageSize: number = 10) {
    console.log('pagination:', page, pageSize);
    try {
      const skip = (page - 1) * pageSize;
      const take = pageSize;
      const [data, totalItems] = await Promise.all([
        this.prisma.user.findMany({
          skip,
          take,
        }),
        this.prisma.user.count(),
      ]);

      const totalPages = Math.ceil(totalItems / pageSize);

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fetched Users',
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
