import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  Body,
  Logger,
  Put,
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
  private readonly enrollmentReportDocFolder = 'Enrollment Reports_Files_';
  private readonly enrollmentReportImageFolder = 'Enrollment Reports_Images';
  private readonly GOOGLE_DRIVE_ENROLLMENT_REPORTS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_ENROLLMENT_REPORTS_IMAGES_FOLDER_ID;
  private readonly GOOGLE_DRIVE_ENROLLMENT_REPORTS_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_ENROLLMENT_REPORTS_FILES_FOLDER_ID;

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
      let verificationFileName = '';
      if (files.enrollmentVerification && files.enrollmentVerification[0]) {
        const file = files.enrollmentVerification[0];
        const timestamp = new Date().getTime();
        verificationFileName = `verification_file_${createDto.creditApplicationId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          verificationFileName,
          file.mimetype,
          this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_IMAGES_FOLDER_ID,
        );
      }

      // Upload enrollment report file if provided
      let reportFileName = '';
      if (files.enrollmentReport && files.enrollmentReport[0]) {
        const file = files.enrollmentReport[0];
        const timestamp = new Date().getTime();
        reportFileName = `enr_report_file_${createDto.creditApplicationId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          reportFileName,
          file.mimetype,
          this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_FILES_FOLDER_ID,
        );
      }

      const rowData = {
        ID: id,
        'Credit Application ID': createDto.creditApplicationId,
        // 'Enrollment Verification for this Year': verificationFileName
        //   ? `${this.enrollmentReportImageFolder}/${verificationFileName}`
        //   : '',
        'Sub County Enrollment Report': verificationFileName
          ? `${this.enrollmentReportImageFolder}/${verificationFileName}`
          : '',
        'Enrollment Report': reportFileName
          ? `${this.enrollmentReportDocFolder}/${reportFileName}`
          : '',
        'Number of Students This Year': createDto.numberOfStudentsThisYear,
        // 'Enrollment Report for this Year': reportFileName
        //   ? `${this.enrollmentReportDocFolder}/${reportFileName}`
        //   : '',
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

      const documentColumns = [
        'Enrollment Report',
        'Sub County Enrollment Report',
      ];
      const datasWithLinks = await Promise.all(
        filteredData.map(async (director) => {
          const dataWithLinks = { ...director };
          for (const column of documentColumns) {
            if (director[column]) {
              let folderId = '';
              if (column == 'Sub County Enrollment Report') {
                folderId =
                  this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_IMAGES_FOLDER_ID;
              } else if (column == 'Enrollment Report') {
                folderId = this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_FILES_FOLDER_ID;
              }
              const filename = director[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                folderId,
              );
              dataWithLinks[column] = fileLink;
            }
          }
          return dataWithLinks;
        }),
      );

      return {
        success: true,
        count: filteredData.length,
        data: datasWithLinks,
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

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'enrollmentVerification', maxCount: 1 },
      { name: 'enrollmentReport', maxCount: 1 },
    ]),
  )
  async updateEnrollmentVerification(
    @Param('id') id: string,
    @Body()
    updateDto: {
      creditApplicationId?: string;
      numberOfStudentsThisYear?: number;
      numberOfStudentsLastYear?: number;
      numberOfStudentsTwoYearsAgo?: number;
    },
    @UploadedFiles()
    files: {
      enrollmentVerification?: Express.Multer.File[];
      enrollmentReport?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating enrollment verification with ID: ${id}`);

      // First verify the enrollment verification exists
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

      // Upload enrollment verification file if provided
      let verificationFileName = '';
      if (files.enrollmentVerification && files.enrollmentVerification[0]) {
        const file = files.enrollmentVerification[0];
        const timestamp = new Date().getTime();
        verificationFileName = `verification_file_${updateDto.creditApplicationId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          verificationFileName,
          file.mimetype,
          this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_IMAGES_FOLDER_ID,
        );
      }

      // Upload enrollment report file if provided
      let reportFileName = '';
      if (files.enrollmentReport && files.enrollmentReport[0]) {
        const file = files.enrollmentReport[0];
        const timestamp = new Date().getTime();
        reportFileName = `enr_report_file_${updateDto.creditApplicationId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          reportFileName,
          file.mimetype,
          this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_FILES_FOLDER_ID,
        );
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        if (header === 'Enrollment Report' && reportFileName) {
          return reportFileName
            ? `${this.enrollmentReportDocFolder}/${reportFileName}`
            : '';
        }
        if (header === 'Sub County Enrollment Report' && verificationFileName) {
          return verificationFileName
            ? `${this.enrollmentReportImageFolder}/${verificationFileName}`
            : '';
        }

        if (
          header === 'Credit Application ID' &&
          updateDto.creditApplicationId
        ) {
          return updateDto.creditApplicationId;
        }
        if (
          header === 'Number of Students This Year' &&
          updateDto.numberOfStudentsThisYear !== undefined
        ) {
          return updateDto.numberOfStudentsThisYear;
        }
        if (
          header === 'Number of students last year' &&
          updateDto.numberOfStudentsLastYear !== undefined
        ) {
          return updateDto.numberOfStudentsLastYear;
        }
        if (
          header === 'Number of students two years ago' &&
          updateDto.numberOfStudentsTwoYearsAgo !== undefined
        ) {
          return updateDto.numberOfStudentsTwoYearsAgo;
        }
        return verificationRow[index] || '';
      });

      // Update the row
      await this.sheetsService.updateRow(this.SHEET_NAME, id, updatedRowData);

      // Get the updated verification record
      const updatedVerification = {};
      headers.forEach((header, index) => {
        updatedVerification[header] = updatedRowData[index];
      });

      return {
        success: true,
        message: 'Enrollment verification updated successfully',
        data: updatedVerification,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error updating enrollment verification: ${apiError.message}`,
      );
      throw error;
    }
  }
}
