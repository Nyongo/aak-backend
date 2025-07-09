import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Logger,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from '../../common/services/common-functions.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('ssl-tracker')
export class SslTrackerController {
  private readonly logger = new Logger(SslTrackerController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  @Get()
  async getAllSslRecords(
    @Query('sslId') sslId?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    try {
      this.logger.debug(
        `Fetching SSL tracker records${sslId ? ` for SSL ID: ${sslId}` : ''}`,
      );

      const pageNum = parseInt(page, 10);
      const pageSizeNum = parseInt(pageSize, 10);
      const skip = (pageNum - 1) * pageSizeNum;

      const where: any = {
        isActive: true,
      };

      if (sslId) {
        where.sslId = sslId;
      }

      const [data, totalItems] = await Promise.all([
        this.prisma.sslStaff.findMany({
          where,
          skip,
          take: pageSizeNum,
          select: {
            id: true,
            name: true,
            type: true,
            borrowerId: true,
            email: true,
            sslId: true,
            nationalIdNumber: true,
            phoneNumber: true,
            status: true,
            roleInSchool: true,
            dateOfBirth: true,
            address: true,
            gender: true,
            startDate: true,
            sslEmail: true,
            sslLevel: true,
            sslArea: true,
            isActive: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.sslStaff.count({ where }),
      ]);

      const totalPages = Math.ceil(totalItems / pageSizeNum);

      return this.commonFunctions.returnFormattedResponse(
        200,
        `Found ${data.length} SSL tracker record(s)`,
        {
          data,
          pagination: {
            currentPage: pageNum,
            pageSize: pageSizeNum,
            totalItems,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1,
          },
        },
      );
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching SSL tracker records: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Get(':id')
  async getSslRecordById(@Param('id') id: string) {
    try {
      this.logger.debug(`Fetching SSL tracker record with ID: ${id}`);

      const record = await this.prisma.sslStaff.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          type: true,
          borrowerId: true,
          email: true,
          sslId: true,
          nationalIdNumber: true,
          phoneNumber: true,
          status: true,
          roleInSchool: true,
          dateOfBirth: true,
          address: true,
          gender: true,
          startDate: true,
          sslEmail: true,
          sslLevel: true,
          sslArea: true,
          isActive: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!record) {
        return {
          success: false,
          error: 'SSL tracker record not found',
        };
      }

      return {
        success: true,
        data: record,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching SSL tracker record: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post()
  async createSslRecord(
    @Body()
    createDto: {
      name: string;
      type: string;
      borrowerId: string;
      email: string;
      sslId: string;
      nationalIdNumber: string;
      phoneNumber: string;
      status?: string;
      roleInSchool: string;
      dateOfBirth: string;
      address: string;
      gender: string;
      startDate: string;
      sslEmail?: string;
      sslLevel?: string;
      sslArea?: string;
    },
  ) {
    try {
      this.logger.debug('Creating new SSL tracker record', createDto);

      // TODO: Get the actual user ID from the authenticated session
      const createdById = 1; // This should come from the authenticated user

      // Generate a unique ID for the SSL Staff record
      const id = `SSL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newRecord = await this.prisma.sslStaff.create({
        data: {
          id,
          ...createDto,
          status: createDto.status || 'Active',
          createdBy: {
            connect: { id: createdById },
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          borrowerId: true,
          email: true,
          sslId: true,
          nationalIdNumber: true,
          phoneNumber: true,
          status: true,
          roleInSchool: true,
          dateOfBirth: true,
          address: true,
          gender: true,
          startDate: true,
          sslEmail: true,
          sslLevel: true,
          sslArea: true,
          isActive: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'SSL tracker record created successfully',
        data: newRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating SSL tracker record: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Put(':id')
  async updateSslRecord(
    @Param('id') id: string,
    @Body()
    updateDto: {
      name?: string;
      type?: string;
      borrowerId?: string;
      email?: string;
      sslId?: string;
      nationalIdNumber?: string;
      phoneNumber?: string;
      status?: string;
      roleInSchool?: string;
      dateOfBirth?: string;
      address?: string;
      gender?: string;
      startDate?: string;
      sslEmail?: string;
      sslLevel?: string;
      sslArea?: string;
    },
  ) {
    try {
      this.logger.debug(
        `Updating SSL tracker record with ID: ${id}`,
        updateDto,
      );

      // Check if record exists
      const existingRecord = await this.prisma.sslStaff.findUnique({
        where: { id },
      });

      if (!existingRecord) {
        return {
          success: false,
          error: 'SSL tracker record not found',
        };
      }

      // TODO: Get the actual user ID from the authenticated session
      const lastUpdatedById = 1; // This should come from the authenticated user

      const updatedRecord = await this.prisma.sslStaff.update({
        where: { id },
        data: {
          ...updateDto,
          lastUpdatedBy: {
            connect: { id: lastUpdatedById },
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          borrowerId: true,
          email: true,
          sslId: true,
          nationalIdNumber: true,
          phoneNumber: true,
          status: true,
          roleInSchool: true,
          dateOfBirth: true,
          address: true,
          gender: true,
          startDate: true,
          sslEmail: true,
          sslLevel: true,
          sslArea: true,
          isActive: true,
          lastUpdatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'SSL tracker record updated successfully',
        data: updatedRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error updating SSL tracker record: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Delete(':id')
  async deleteSslRecord(@Param('id') id: string) {
    try {
      this.logger.debug(`Deleting SSL tracker record with ID: ${id}`);

      // Check if record exists
      const existingRecord = await this.prisma.sslStaff.findUnique({
        where: { id },
      });

      if (!existingRecord) {
        return {
          success: false,
          error: 'SSL tracker record not found',
        };
      }

      // Soft delete by setting isActive to false
      await this.prisma.sslStaff.update({
        where: { id },
        data: { isActive: false },
      });

      return {
        success: true,
        message: 'SSL tracker record deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error deleting SSL tracker record: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
