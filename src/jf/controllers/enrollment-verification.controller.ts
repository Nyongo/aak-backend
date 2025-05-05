import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  Body,
  Logger,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/enrollment-verification')
export class EnrollmentVerificationController {
  private readonly logger = new Logger(EnrollmentVerificationController.name);
  private readonly SHEET_NAME = 'Enrollment Reports';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'enrollmentVerification', maxCount: 1 },
      { name: 'enrollmentReport', maxCount: 1 },
    ]),
  )
  async createEnrollmentVerification(
    @Body()
    createDto: {
      creditApplicationId: string;
      numberOfStudentsThisYear: number;
      numberOfStudentsLastYear: number;
      numberOfStudentsTwoYearsAgo: number;
    },
    @UploadedFiles()
    files: {
      enrollmentVerification?: Express.Multer.File[];
      enrollmentReport?: Express.Multer.File[];
    },
  ) {
    try {
      // Generate unique ID for the verification
      const id = `ENR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Format current date as DD/MM/YYYY HH:mm:ss
      const now = new Date();
      const createdAt = now.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Upload enrollment verification file if provided
      let verificationUrl = '';
      if (files.enrollmentVerification && files.enrollmentVerification[0]) {
        const file = files.enrollmentVerification[0];
        verificationUrl = await this.googleDriveService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
        );
      }

      // Upload enrollment report file if provided
      let reportUrl = '';
      if (files.enrollmentReport && files.enrollmentReport[0]) {
        const file = files.enrollmentReport[0];
        reportUrl = await this.googleDriveService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
        );
      }

      const rowData = {
        ID: id,
        'Credit Application ID': createDto.creditApplicationId,
        'Enrollment Verification for this Year': verificationUrl,
        'Enrollment Report': verificationUrl,
        'Sub County Enrollment Report': reportUrl,
        'Number of Students This Year': createDto.numberOfStudentsThisYear,
        'Enrollment Report for this Year': reportUrl,
        'Number of students last year': createDto.numberOfStudentsLastYear,
        'Number of students two years ago':
          createDto.numberOfStudentsTwoYearsAgo,
        'Created At': createdAt,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Enrollment verification record created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating enrollment verification record: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getVerificationsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching enrollment verifications for application ID: ${creditApplicationId}`,
      );

      const verifications = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );

      if (!verifications || verifications.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = verifications[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      if (applicationIdIndex === -1) {
        return {
          success: false,
          message: 'Credit Application ID column not found',
          data: [],
        };
      }

      const filteredData = verifications
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const verification = {};
          headers.forEach((header, index) => {
            verification[header] = row[index];
          });
          return verification;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching enrollment verifications for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getVerificationById(@Param('id') id: string) {
    try {
      const verifications = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );
      if (!verifications || verifications.length === 0) {
        return { success: false, message: 'No enrollment verifications found' };
      }

      const headers = verifications[0];
      const idIndex = headers.indexOf('ID');
      const verificationRow = verifications.find((row) => row[idIndex] === id);

      if (!verificationRow) {
        return { success: false, message: 'Enrollment verification not found' };
      }

      const verification = {};
      headers.forEach((header, index) => {
        verification[header] = verificationRow[index];
      });

      return { success: true, data: verification };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching enrollment verification ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllVerifications() {
    try {
      const verifications = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );

      if (!verifications || verifications.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = verifications[0];
      const data = verifications.slice(1).map((row) => {
        const verification = {};
        headers.forEach((header, index) => {
          verification[header] = row[index];
        });
        return verification;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all enrollment verifications: ${apiError.message}`,
      );
      throw error;
    }
  }
}
