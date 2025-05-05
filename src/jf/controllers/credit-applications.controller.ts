import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Logger,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCreditApplicationDto } from '../dto/create-credit-application.dto';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/credit-applications')
export class CreditApplicationsController {
  private readonly logger = new Logger(CreditApplicationsController.name);
  private readonly SHEET_NAME = 'Credit Applications';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get()
  async getAllApplications() {
    try {
      const applications = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );
      if (!applications || applications.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = applications[0];
      const data = applications.slice(1).map((row) => {
        const application = {};
        headers.forEach((header, index) => {
          application[header] = row[index];
        });
        return application;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching credit applications: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getApplicationById(@Param('id') id: string) {
    try {
      const applications = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );
      if (!applications || applications.length === 0) {
        return { success: false, message: 'No applications found' };
      }

      const headers = applications[0];
      const idIndex = headers.indexOf('ID');
      const applicationRow = applications.find((row) => row[idIndex] === id);

      if (!applicationRow) {
        return { success: false, message: 'Application not found' };
      }

      const application = {};
      headers.forEach((header, index) => {
        application[header] = applicationRow[index];
      });

      return { success: true, data: application };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching application ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('checkPhoto'))
  async createApplication(
    @Body() createDto: CreateCreditApplicationDto,
    @UploadedFile() checkPhoto: Express.Multer.File,
  ) {
    try {
      let checkPhotoUrl = '';
      if (checkPhoto) {
        checkPhotoUrl = await this.googleDriveService.uploadFile(
          checkPhoto.buffer,
          checkPhoto.originalname,
          checkPhoto.mimetype,
        );
      }

      const id = `CA-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const now = new Date().toISOString();

      const rowData = {
        ID: id,
        'Borrower ID': createDto['Borrower ID'],
        'Application Start Date': createDto['Application Start Date'],
        'Credit Type': createDto['Credit Type'],
        'Total Amount Requested': createDto['Total Amount Requested'],
        'Working Capital Application Number':
          createDto['Working Capital Application Number'] || '',
        'SSL Action Needed': createDto['SSL Action Needed'] || false,
        'SSL Action': createDto['SSL Action'] || '',
        'SSL Feedback on Action': createDto['SSL Feedback on Action'] || '',
        'School CRB Available': createDto['School CRB Available'] || false,
        'Referred By': createDto['Referred By'] || '',
        'Current Cost of Capital': createDto['Current Cost of Capital'] || 0,
        'Checks Collected': createDto['Checks Collected'] || 0,
        'Checks Needed for Loan': createDto['Checks Needed for Loan'] || 0,
        'Photo of Check': checkPhotoUrl,
        'Comments on Checks': createDto['Comments on Checks'] || '',
        'Created At': now,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Credit application created successfully',
        data: { id, ...rowData },
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating credit application: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('search/by-date')
  async getApplicationsByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const applications = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );
      if (!applications || applications.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = applications[0];
      const dateIndex = headers.indexOf('Application Start Date');

      const start = new Date(startDate);
      const end = new Date(endDate);

      const filteredData = applications
        .slice(1)
        .filter((row) => {
          const appDate = new Date(row[dateIndex]);
          return appDate >= start && appDate <= end;
        })
        .map((row) => {
          const application = {};
          headers.forEach((header, index) => {
            application[header] = row[index];
          });
          return application;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error searching applications by date: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-borrower/:borrowerId')
  async getApplicationsByBorrower(@Param('borrowerId') borrowerId: string) {
    try {
      this.logger.log(
        `Fetching credit applications for borrower: ${borrowerId}`,
      );
      const applications = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );

      if (!applications || applications.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = applications[0];
      const borrowerIdIndex = headers.indexOf('Borrower ID');

      if (borrowerIdIndex === -1) {
        throw new Error('Borrower ID column not found in sheet');
      }

      const filteredData = applications
        .slice(1)
        .filter((row) => row[borrowerIdIndex] === borrowerId)
        .map((row) => {
          const application = {};
          headers.forEach((header, index) => {
            application[header] = row[index];
          });
          return application;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching applications for borrower ${borrowerId}: ${apiError.message}`,
      );
      throw error;
    }
  }
}
