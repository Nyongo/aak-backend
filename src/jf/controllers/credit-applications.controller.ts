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
  Put,
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
        'School CRB Available?': createDto['School CRB Available?'] || 'FALSE',
        'Referred By': createDto['Referred By'] || '',
        'Current Cost of Capital': createDto['Current Cost of Capital'] || 0,
        'Checks Collected': createDto['Checks Collected'] || 0,
        'Checks Needed for Loan': createDto['Checks Needed for Loan'] || 0,
        'Photo of Check': checkPhotoUrl,
        Status: createDto['Status'] || 'In Progress',
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

  @Put(':id')
  @UseInterceptors(FileInterceptor('checkPhoto'))
  async updateApplication(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateCreditApplicationDto>,
    @UploadedFile() checkPhoto: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating credit application with ID: ${id}`);

      // First verify the application exists
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

      // Handle check photo upload if provided
      let checkPhotoUrl = '';
      if (checkPhoto) {
        checkPhotoUrl = await this.googleDriveService.uploadFile(
          checkPhoto.buffer,
          checkPhoto.originalname,
          checkPhoto.mimetype,
        );
        updateData['Photo of Check'] = checkPhotoUrl;
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        // Map the header to the corresponding DTO field
        const dtoField = this.mapHeaderToDtoField(header);
        if (updateData[dtoField] !== undefined) {
          return updateData[dtoField];
        }
        // For check photo, use the new URL if provided
        if (header === 'Photo of Check' && checkPhotoUrl) {
          return checkPhotoUrl;
        }
        return applicationRow[index] || '';
      });

      // Update the row
      await this.sheetsService.updateRow(this.SHEET_NAME, id, updatedRowData);

      // Get the updated application
      const updatedApplication = {};
      headers.forEach((header, index) => {
        updatedApplication[header] = updatedRowData[index];
      });

      return {
        success: true,
        message: 'Credit application updated successfully',
        data: updatedApplication,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error updating credit application ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  private mapHeaderToDtoField(header: string): string {
    // Map sheet headers to DTO field names
    const headerMap = {
      'Borrower ID': 'Borrower ID',
      'Application Start Date': 'Application Start Date',
      'Credit Type': 'Credit Type',
      'Total Amount Requested': 'Total Amount Requested',
      'Working Capital Application Number':
        'Working Capital Application Number',
      'SSL Action Needed': 'SSL Action Needed',
      'SSL Action': 'SSL Action',
      'SSL Feedback on Action': 'SSL Feedback on Action',
      'School CRB Available?': 'School CRB Available',
      'Referred By': 'Referred By',
      'Current Cost of Capital': 'Current Cost of Capital',
      'Checks Collected': 'Checks Collected',
      'Checks Needed for Loan': 'Checks Needed for Loan',
      'Comments on Checks': 'Comments on Checks',
      Status: 'Status',
      'Photo of Check': 'Photo of Check',
    };

    return headerMap[header] || header;
  }
}
