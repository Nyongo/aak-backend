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
import { SchoolsService } from '../services/schools.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('schools')
export class SchoolsController {
  private readonly logger = new Logger(SchoolsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly schoolsService: SchoolsService,
  ) {}

  @Get()
  async getAllSchools(
    @Query('schoolId') schoolId?: string,
    @Query('region') region?: string,
    @Query('county') county?: string,
    @Query('sslId') sslId?: string,
  ) {
    try {
      this.logger.debug(
        `Fetching schools${schoolId ? ` with school ID: ${schoolId}` : ''}${region ? ` in region: ${region}` : ''}${county ? ` in county: ${county}` : ''}${sslId ? ` with SSL ID: ${sslId}` : ''}`,
      );

      return await this.schoolsService.findAll(
        1,
        1000,
        schoolId,
        region,
        county,
        sslId,
      );
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching schools: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Get(':id')
  async getSchoolById(@Param('id') id: string) {
    try {
      this.logger.debug(`Fetching school with ID: ${id}`);

      return await this.schoolsService.findOne(id);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching school: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post()
  async createSchool(
    @Body()
    createDto: {
      id: string;
      name: string;
      schoolId: string;
      email?: string;
      phoneNumber?: string;
      address?: string;
      postalAddress?: string;
      county?: string;
      region?: string;
      schoolType?: string;
      status?: string;
      principalName?: string;
      principalPhone?: string;
      principalEmail?: string;
      totalStudents?: number;
      totalTeachers?: number;
      registrationNumber?: string;
      establishmentDate?: string;
    },
  ) {
    try {
      this.logger.debug('Creating new school', createDto);

      return await this.schoolsService.create(createDto);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error creating school: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Put(':id')
  async updateSchool(
    @Param('id') id: string,
    @Body()
    updateDto: {
      name?: string;
      schoolId?: string;
      email?: string;
      phoneNumber?: string;
      address?: string;
      postalAddress?: string;
      county?: string;
      region?: string;
      schoolType?: string;
      status?: string;
      principalName?: string;
      principalPhone?: string;
      principalEmail?: string;
      totalStudents?: number;
      totalTeachers?: number;
      registrationNumber?: string;
      establishmentDate?: string;
    },
  ) {
    try {
      this.logger.debug(`Updating school with ID: ${id}`, updateDto);

      return await this.schoolsService.update(id, updateDto);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating school: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Delete(':id')
  async deleteSchool(@Param('id') id: string) {
    try {
      this.logger.debug(`Deleting school with ID: ${id}`);

      return await this.schoolsService.delete(id);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error deleting school: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
