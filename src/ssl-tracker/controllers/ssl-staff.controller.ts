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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SslStaffService } from '../services/ssl-staff.service';
import { UserMigrationService } from '../services/user-migration.service';

@Controller('staff')
export class SslStaffController {
  private readonly logger = new Logger(SslStaffController.name);

  constructor(
    private readonly sslStaffService: SslStaffService,
    private readonly userMigrationService: UserMigrationService,
  ) {}

  @Get()
  async getAllSslStaff(
    @Query('sslId') sslId?: string,
    @Query('borrowerId') borrowerId?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    try {
      this.logger.debug(
        `Fetching SSL staff records${sslId ? ` for SSL ID: ${sslId}` : ''}${borrowerId ? ` for Borrower ID: ${borrowerId}` : ''}`,
      );

      const pageNum = parseInt(page, 10);
      const pageSizeNum = parseInt(pageSize, 10);

      return await this.sslStaffService.findAll(
        pageNum,
        pageSizeNum,
        sslId,
        borrowerId,
      );
    } catch (error) {
      this.logger.error(
        `Error fetching SSL staff records: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message || 'An unknown error occurred',
      };
    }
  }

  @Get(':id')
  async getSslStaffById(@Param('id') id: string) {
    try {
      this.logger.debug(`Fetching SSL staff record with ID: ${id}`);

      return await this.sslStaffService.findOne(id);
    } catch (error) {
      this.logger.error(
        `Error fetching SSL staff record: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message || 'An unknown error occurred',
      };
    }
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'nationalIdFront', maxCount: 1 },
      { name: 'nationalIdBack', maxCount: 1 },
      { name: 'kraPinPhoto', maxCount: 1 },
      { name: 'passportPhoto', maxCount: 1 },
    ]),
  )
  async createSslStaff(
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
      postalAddress?: string;
      startDate: string;
      insuredForCreditLife?: boolean;
      paymentThisMonth?: boolean;
      terminationDate?: string;
      educationLevel?: string;
      sslEmail?: string;
      secondaryRole?: string;
      monthlyTarget?: string;
      creditLifeHelper?: string;
      teamLeader?: string;
      sslLevel?: string;
      sslArea?: string;
      kraPinNumber?: string;
    },
    @UploadedFiles()
    files: {
      nationalIdFront?: Express.Multer.File[];
      nationalIdBack?: Express.Multer.File[];
      kraPinPhoto?: Express.Multer.File[];
      passportPhoto?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.debug('Creating new SSL staff record', createDto);

      // TODO: Get the actual user ID from the authenticated session
      const createdById = 1; // This should come from the authenticated user

      return await this.sslStaffService.create(createDto, files, createdById);
    } catch (error) {
      this.logger.error(
        `Error creating SSL staff record: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message || 'An unknown error occurred',
      };
    }
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'nationalIdFront', maxCount: 1 },
      { name: 'nationalIdBack', maxCount: 1 },
      { name: 'kraPinPhoto', maxCount: 1 },
      { name: 'passportPhoto', maxCount: 1 },
    ]),
  )
  async updateSslStaff(
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
      postalAddress?: string;
      startDate?: string;
      insuredForCreditLife?: boolean;
      paymentThisMonth?: boolean;
      terminationDate?: string;
      educationLevel?: string;
      sslEmail?: string;
      secondaryRole?: string;
      monthlyTarget?: string;
      creditLifeHelper?: string;
      teamLeader?: string;
      sslLevel?: string;
      sslArea?: string;
      kraPinNumber?: string;
    },
    @UploadedFiles()
    files: {
      nationalIdFront?: Express.Multer.File[];
      nationalIdBack?: Express.Multer.File[];
      kraPinPhoto?: Express.Multer.File[];
      passportPhoto?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.debug(`Updating SSL staff record with ID: ${id}`, updateDto);

      // TODO: Get the actual user ID from the authenticated session
      const lastUpdatedById = 1; // This should come from the authenticated user

      return await this.sslStaffService.update(
        id,
        updateDto,
        files,
        lastUpdatedById,
      );
    } catch (error) {
      this.logger.error(
        `Error updating SSL staff record: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message || 'An unknown error occurred',
      };
    }
  }

  @Delete(':id')
  async deleteSslStaff(@Param('id') id: string) {
    try {
      this.logger.debug(`Deleting SSL staff record with ID: ${id}`);

      return await this.sslStaffService.delete(id);
    } catch (error) {
      this.logger.error(
        `Error deleting SSL staff record: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message || 'An unknown error occurred',
      };
    }
  }

  // Migration endpoints
  @Get('migration/preview')
  async previewMigration() {
    try {
      this.logger.debug('Previewing SSL Staff migration from Google Sheet');
      return await this.userMigrationService.previewMigration();
    } catch (error) {
      this.logger.error(
        `Error previewing migration: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message || 'An unknown error occurred',
      };
    }
  }

  @Post('migration/run')
  async runMigration() {
    try {
      this.logger.debug('Starting SSL Staff migration from Google Sheet');
      return await this.userMigrationService.migrateUsersFromSheet();
    } catch (error) {
      this.logger.error(`Error running migration: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error).message || 'An unknown error occurred',
      };
    }
  }

  @Get('migration/status')
  async getMigrationStatus() {
    try {
      this.logger.debug('Getting SSL Staff migration status');
      return await this.userMigrationService.getMigrationStatus();
    } catch (error) {
      this.logger.error(
        `Error getting migration status: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: (error as Error).message || 'An unknown error occurred',
      };
    }
  }
}
