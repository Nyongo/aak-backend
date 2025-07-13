import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from '../../common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class SchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async create(createDto: any, createdById?: number) {
    try {
      const newSchool = await this.prisma.school.create({
        data: {
          ...createDto,
          createdById: createdById || 1,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'School record created successfully.',
        newSchool,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    schoolId?: string,
    region?: string,
    county?: string,
    sslId?: string,
  ) {
    try {
      const where: any = {
        isActive: true,
      };

      if (schoolId) {
        where.schoolId = schoolId;
      }

      if (region) {
        where.region = region;
      }

      if (county) {
        where.county = county;
      }

      if (sslId) {
        where.sslId = sslId;
      }

      const data = await this.prisma.school.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'School records fetched successfully.',
        {
          data,
          totalItems: data.length,
        },
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findOne(id: string) {
    try {
      const record = await this.prisma.school.findUnique({
        where: { id },
      });

      if (!record) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'School record not found.',
          null,
        );
      }

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'School record retrieved successfully.',
        record,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(id: string, updateDto: any, lastUpdatedById?: number) {
    try {
      // Check if record exists
      const existingRecord = await this.prisma.school.findUnique({
        where: { id },
      });

      if (!existingRecord) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'School record not found.',
          null,
        );
      }

      const updateData: any = { ...updateDto };
      updateData.lastUpdatedById = lastUpdatedById || 1;

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const updatedRecord = await this.prisma.school.update({
        where: { id },
        data: updateData,
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'School record updated successfully.',
        updatedRecord,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async delete(id: string) {
    try {
      const record = await this.prisma.school.findUnique({
        where: { id },
      });

      if (!record) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'School record not found.',
          null,
        );
      }

      // Soft delete by setting isActive to false
      await this.prisma.school.update({
        where: { id },
        data: { isActive: false },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'School record deleted successfully.',
        null,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}
