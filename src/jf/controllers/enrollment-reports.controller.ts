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

@Controller('jf/enrollments/reports')
export class EnrollmentReportsController {
  private readonly logger = new Logger(EnrollmentReportsController.name);
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
  async createEnrollmentReport(
    @Body()
    createDto: {
      creditApplicationId: string;
      numberOfStudentsThisYear: number;
      numberOfStudentsLastYear: number;
      numberOfStudentsTwoYearsAgo: number;
    },
    @UploadedFiles()
    files: {
      subCountyEnrollmentReportPhoto?: Express.Multer.File[];
      subCountyEnrollmentReportDocument?: Express.Multer.File[];
    },
  ) {
    try {
      // Generate unique ID for the report
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

      // Upload files to Google Drive if provided
      let photoUrl = '';
      let documentUrl = '';

      if (files.subCountyEnrollmentReportPhoto?.[0]) {
        const photo = files.subCountyEnrollmentReportPhoto[0];
        photoUrl = await this.googleDriveService.uploadFile(
          photo.buffer,
          photo.originalname,
          photo.mimetype,
        );
      }

      if (files.subCountyEnrollmentReportDocument?.[0]) {
        const document = files.subCountyEnrollmentReportDocument[0];
        documentUrl = await this.googleDriveService.uploadFile(
          document.buffer,
          document.originalname,
          document.mimetype,
        );
      }

      const rowData = {
        ID: id,
        'Credit Application ID': createDto.creditApplicationId,
        //'Sub County Enrollment Report(Photo)': photoUrl,
        'Enrollment Report': photoUrl,
        'Sub County Enrollment Report': documentUrl,
        'Number of Students This Year': createDto.numberOfStudentsThisYear,
        'Number of students last year': createDto.numberOfStudentsLastYear,
        'Number of students two years ago':
          createDto.numberOfStudentsTwoYearsAgo,
        'Created At': createdAt,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Enrollment report created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating enrollment report: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getReportsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      const reports = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!reports || reports.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = reports[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      const filteredData = reports
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const report = {};
          headers.forEach((header, index) => {
            report[header] = row[index];
          });
          return report;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching reports for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }
}
