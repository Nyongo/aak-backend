import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateSspUserDto } from '../dtos/create-ssp-user.dto';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SspUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async createb(createDto: CreateSspUserDto) {
    try {
      // 🔹 Step 1: Concatenate Names (if available)
      const fullName = [
        createDto.firstName,
        createDto.middleName,
        createDto.lastName,
      ]
        .filter(Boolean) // Remove empty values
        .join(' ');

      // 🔹 Step 2: Define the Role ID for SSP Users
      const SSP_ROLE_ID = this.configService.get<string>('SSP_ROLE_ID');

      // 🔹 Step 3: Create User using UsersService
      const userResponse = await this.usersService.create({
        email: createDto.email,
        name: fullName,
        roleId: Number(SSP_ROLE_ID),
        isActive: createDto.isActive ?? true,
      });
      // Extract created user from response
      if (userResponse?.response?.code !== HttpStatus.OK) {
        return userResponse; // Forward error response if user creation failed
      }
      const user = userResponse.data;

      // 🔹 Step 4: Create SspUser Using the New User's ID
      const sspUser = await this.prisma.sspUser.create({
        data: {
          userId: user.id,
          email: createDto.email,
          phoneNumber: createDto.phoneNumber,
          firstName: createDto.firstName,
          middleName: createDto.middleName,
          lastName: createDto.lastName,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'User and SspUser created successfully.',
        { user, sspUser },
      );
    } catch (error) {
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async create(createDto: CreateSspUserDto) {
    try {
      // 🔹 Step 1: Concatenate Names (if available)
      const fullName = [
        createDto.firstName,
        createDto.middleName,
        createDto.lastName,
      ]
        .filter(Boolean) // Remove empty values
        .join(' ');

      // 🔹 Step 2: Define the Role ID for SSP Users
      const SSP_ROLE_ID = this.configService.get<string>('SSP_ROLE_ID');

      // 🔹 Step 3: Create User using UsersService
      const userResponse = await this.usersService.create({
        email: createDto.email,
        name: fullName,
        roleId: Number(SSP_ROLE_ID),
        isActive: createDto.isActive ?? true,
      });

      // Step 3.1: Check if user creation was successful
      if (userResponse?.response?.code !== HttpStatus.OK) {
        return userResponse; // Forward error response if user creation failed
      }

      const user = userResponse.data;

      try {
        // 🔹 Step 4: Create SspUser Using the New User's ID
        const sspUser = await this.prisma.sspUser.create({
          data: {
            userId: user.id,
            email: createDto.email,
            phoneNumber: createDto.phoneNumber,
            firstName: createDto.firstName,
            middleName: createDto.middleName,
            lastName: createDto.lastName,
          },
        });
        if (sspUser) {
          const startDate = new Date();
          const endDate = new Date(new Date().getFullYear(), 11, 31);
          await this.generateYearlySchedule(sspUser.id, startDate, endDate);
          return this.commonFunctions.returnFormattedResponse(
            HttpStatus.CREATED,
            'User and SspUser created successfully.',
            { user, sspUser },
          );
        }
      } catch (sspUserError) {
        // 🔹 Step 5: Rollback - Delete user if sspUser creation fails
        await this.prisma.user.delete({ where: { id: user.id } });

        throw sspUserError; // Re-throw the error to be handled by the outer catch block
      }
    } catch (error) {
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async generateYearlySchedule(sspId: number, startDate: Date, endDate: Date) {
    const schedules = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      let startHour = 9; // Start at 09:00 AM
      let endHour = 17; // End at 05:00 PM

      while (startHour < endHour) {
        const startTime = new Date(currentDate);
        startTime.setHours(startHour, 0, 0, 0); // Set the start hour

        const endTime = new Date(startTime);
        endTime.setHours(startHour + 1, 0, 0, 0); // 1-hour interval

        schedules.push({
          sspId,
          date: currentDate.toISOString(), // Keep only the date part
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

        startHour++; // Move to the next 1-hour slot
      }

      currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
    }

    await this.prisma.sspSchedule.createMany({ data: schedules });
  }

  async findAll(page: number = 1, pageSize: number = 10) {
    try {
      const skip = (page - 1) * pageSize;
      const take = pageSize;
      const [data, totalItems] = await Promise.all([
        this.prisma.sspUser.findMany({
          skip,
          take,
        }),
        this.prisma.sspUser.count(),
      ]);

      const totalPages = Math.ceil(totalItems / pageSize);

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fetched Records',
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

  async findOne(
    id: number,
  ): Promise<{ response: { code: number; message: string }; data: any }> {
    try {
      const record = await this.prisma.sspUser.findUnique({
        where: { id },
      });
      if (!record) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'No record found',
          null,
        );
      }
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Retrieved Successfully',
        record,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(
    id: number,
    updateDto: any,
  ): Promise<{ response: { code: number; message: string }; data: any }> {
    try {
      const updatedRecord = await this.prisma.sspUser.update({
        where: { id },
        data: updateDto,
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Updated Successfully',
        updatedRecord,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async delete(
    id: number,
  ): Promise<{ response: { code: number; message: string }; data: any }> {
    try {
      const record = await this.prisma.sspUser.delete({
        where: { id },
      });

      return this.commonFunctions.returnFormattedResponse(
        200,
        'Deleted Successfully',
        record,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}
