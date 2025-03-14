import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateFarmerUserDto } from '../dtos/create-farmer-user.dto';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FarmerUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async createb(createDto: CreateFarmerUserDto) {
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
      const FARMER_ROLE_ID = this.configService.get<string>('FARMER_ROLE_ID');

      // 🔹 Step 3: Create User using UsersService
      const userResponse = await this.usersService.create({
        email: createDto.email,
        name: fullName,
        roleId: Number(FARMER_ROLE_ID),
        isActive: createDto.isActive ?? true,
      });
      // Extract created user from response
      if (userResponse?.response?.code !== HttpStatus.OK) {
        return userResponse; // Forward error response if user creation failed
      }
      const user = userResponse.data;

      // 🔹 Step 4: Create farmerUser Using the New User's ID
      const farmerUser = await this.prisma.farmerUser.create({
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
        'User and farmerUser created successfully.',
        { user, farmerUser },
      );
    } catch (error) {
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async create(createDto: CreateFarmerUserDto) {
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
      const FARMER_ROLE_ID = this.configService.get<string>('FARMER_ROLE_ID');

      // 🔹 Step 3: Create User using UsersService
      const userResponse = await this.usersService.create({
        email: createDto.email,
        name: fullName,
        gender: createDto.gender,
        dob: createDto.dob,
        roleId: Number(FARMER_ROLE_ID),
        isActive: createDto.isActive ?? true,
      });

      // Step 3.1: Check if user creation was successful
      if (userResponse?.response?.code !== HttpStatus.OK) {
        return userResponse; // Forward error response if user creation failed
      }

      const user = userResponse.data;

      try {
        // 🔹 Step 4: Create farmerUser Using the New User's ID
        const farmerUser = await this.prisma.farmerUser.create({
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
          'User and farmerUser created successfully.',
          { user, farmerUser },
        );
      } catch (farmerUserError) {
        // 🔹 Step 5: Rollback - Delete user if farmerUser creation fails
        await this.prisma.user.delete({ where: { id: user.id } });

        throw farmerUserError; // Re-throw the error to be handled by the outer catch block
      }
    } catch (error) {
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findAll(page: number = 1, pageSize: number = 10) {
    try {
      const skip = (page - 1) * pageSize;
      const take = pageSize;
      const [data, totalItems] = await Promise.all([
        this.prisma.farmerUser.findMany({
          skip,
          take,
        }),
        this.prisma.farmerUser.count(),
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
      const record = await this.prisma.farmerUser.findUnique({
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
      const updatedRecord = await this.prisma.farmerUser.update({
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
      const record = await this.prisma.farmerUser.delete({
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

  async findFarmerFarms(farmerId: number) {
    try {
      const data = await this.prisma.farmerFarm.findMany({
        where: { farmerId },
        include: {
          county: true,
        },
      });
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fetched Records',
        data,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}
