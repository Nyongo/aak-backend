import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Permission } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MailService } from 'src/common/services/mail.service';
import { ChangePasswordDto } from './dtos/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly mailService: MailService,
  ) {}

  async create(createUserDto: any) {
    try {
      if (!createUserDto.email || !createUserDto.name) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.BAD_REQUEST,
          'Missing required fields: email or name.',
          null,
        );
      }

      const generatedPassword = crypto.randomBytes(6).toString('hex');
      console.log(generatedPassword);
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      const newUser = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          name: createUserDto.name,
          phoneNumber: createUserDto.phoneNumber || null,
          password: hashedPassword,
          roleId: createUserDto.roleId || null,
          isActive: createUserDto.isActive,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          roleId: true,
          role: true,
        },
      });

      this.mailService.sendPasswordEmail(newUser.email, generatedPassword);

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'User created successfully. Password sent via email.',
        newUser,
      );
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          return this.commonFunctions.returnFormattedResponse(
            HttpStatus.BAD_REQUEST,
            `The email ${createUserDto.email} is already in use.`,
            null,
          );
        }
      }

      console.error('Unknown error:', e);
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Internal server error.',
        null,
      );
    }
  }

  async findOne(id: number): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
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

  async update(id: number, updateUserDto: any): Promise<any> {
    try {
      const { email, password, ...updateData } = updateUserDto;

      if (email || password) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.BAD_REQUEST,
          'Email and password cannot be updated through this endpoint.',
          null,
        );
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
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
          createdAt: true,
          lastLoggedInOn: true,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Profile updated successfully',
        updatedUser,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      console.error('Unknown error in update profile:', error);
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async assignRoleToUser(userId: number, roleId: number): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        role: { connect: { id: roleId } },
      },
    });
  }
  async findAll(page: number = 1, pageSize: number = 10, search?: string) {
    try {
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      // Build search conditions
      const searchConditions = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              {
                phoneNumber: { contains: search, mode: 'insensitive' as const },
              },
            ],
          }
        : {};

      const [data, totalItems] = await Promise.all([
        this.prisma.user.findMany({
          where: searchConditions,
          skip,
          take,
          orderBy: {
            id: 'desc',
          },
          select: {
            id: true,
            email: true,
            name: true,
            phoneNumber: true,
            isActive: true,
            lastLoggedInOn: true,
            createdAt: true,
            requirePasswordReset: true,
            roleId: true,
            role: true,
            sspUser: true,
          },
        }),
        this.prisma.user.count({ where: searchConditions }),
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

  async changePassword(dto: any) {
    const { id, currentPassword, newPassword, repeatNewPassword } = dto;

    // Validate if new passwords match
    if (newPassword !== repeatNewPassword) {
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.BAD_REQUEST,
        'New Passwords do not match.',
        null,
      );
    }

    // Fetch the user
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });
    if (!user) {
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.NOT_FOUND,
        'User Not Found.',
        null,
      );
    }

    // Compare current password
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!passwordMatches) {
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.BAD_REQUEST,
        'Current Password Is Incorrect.',
        null,
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in the database
    await this.prisma.user.update({
      where: { id: dto.id },
      data: { password: hashedPassword },
    });

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Password Changed Successfully.',
      null,
    );
  }

  async hashPassword() {
    const generatedPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    return { hashedPassword, generatedPassword };
  }

  async resetPassword(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
      },
    });
    console.log(user);
    const passwordData = await this.hashPassword();

    this.mailService.sendPasswordEmail(
      user.email,
      passwordData.generatedPassword,
      true,
    );

    await this.prisma.user.update({
      where: { id },
      data: { password: passwordData.hashedPassword },
    });
    // await this.prisma.user.update({
    //   where: { id },
    //   data: { requirePasswordReset: false },
    // });

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      `Password reset successfully. Password sent via email.`,
      user,
    );
  }
}
