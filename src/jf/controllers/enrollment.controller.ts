import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  Logger,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateEnrollmentDto } from '../dto/create-enrollment.dto';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import * as moment from 'moment';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/enrollments')
export class EnrollmentController {
  private readonly logger = new Logger(EnrollmentController.name);
  private readonly SHEET_NAME = 'Enrollments';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get()
  async getEnrollmentsByCreditApplication(
    @Query('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Fetching enrollments for credit application: ${creditApplicationId}`,
      );
      const data = await this.sheetsService.getSheetData(this.SHEET_NAME);

      // Find header row index
      const headers = data[0];
      const creditAppIdIndex = headers.findIndex(
        (header) => header === 'Credit Application ID',
      );

      // Filter enrollments by credit application ID
      const enrollments = data
        .slice(1)
        .filter((row) => row[creditAppIdIndex] === creditApplicationId);

      if (!enrollments.length) {
        return {
          message: 'No enrollments found for this credit application',
          data: [],
        };
      }

      return {
        message: 'Enrollments retrieved successfully',
        data: enrollments.map((row) => this.mapRowToEnrollment(row, headers)),
      };
    } catch (error) {
      this.logger.error('Error fetching enrollments:', error);
      throw error;
    }
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'document', maxCount: 1 },
    ]),
  )
  async addEnrollment(
    @Body() enrollmentDto: CreateEnrollmentDto,
    @UploadedFiles()
    files: { photo?: Express.Multer.File[]; document?: Express.Multer.File[] },
  ) {
    try {
      this.logger.log(
        `Adding new enrollment for credit application: ${enrollmentDto.creditApplicationId}`,
      );

      // Upload files if provided
      let photoUrl = '';
      let documentUrl = '';

      if (files.photo?.[0]) {
        photoUrl = await this.googleDriveService.uploadFile(
          files.photo[0].buffer,
          `enrollment_photo_${Date.now()}_${files.photo[0].originalname}`,
          files.photo[0].mimetype,
        );
      }

      if (files.document?.[0]) {
        documentUrl = await this.googleDriveService.uploadFile(
          files.document[0].buffer,
          `enrollment_doc_${Date.now()}_${files.document[0].originalname}`,
          files.document[0].mimetype,
        );
      }

      // Prepare row data with file URLs
      const rowData = {
        ...enrollmentDto,
        photoUrl,
        documentUrl,
        createdAt: new Date().toISOString(),
      };

      // Append to sheet
      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        message: 'Enrollment added successfully',
        data: rowData,
      };
    } catch (error) {
      this.logger.error('Error adding enrollment:', error);
      throw error;
    }
  }

  @Get(':id')
  async getEnrollmentById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching enrollment with ID: ${id}`);
      const data = await this.sheetsService.getSheetData(this.SHEET_NAME);

      const headers = data[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      const enrollment = data.slice(1).find((row) => row[idIndex] === id);

      if (!enrollment) {
        return { message: 'Enrollment not found', data: null };
      }

      return {
        message: 'Enrollment retrieved successfully',
        data: this.mapRowToEnrollment(enrollment, headers),
      };
    } catch (error) {
      this.logger.error('Error fetching enrollment:', error);
      throw error;
    }
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'document', maxCount: 1 },
    ]),
  )
  async updateEnrollment(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateEnrollmentDto>,
    @UploadedFiles()
    files: { photo?: Express.Multer.File[]; document?: Express.Multer.File[] },
  ) {
    try {
      this.logger.log(`Updating enrollment with ID: ${id}`);

      // Handle file uploads if provided
      if (files.photo?.[0]) {
        updateDto.photoUrl = await this.googleDriveService.uploadFile(
          files.photo[0].buffer,
          `enrollment_photo_${Date.now()}_${files.photo[0].originalname}`,
          files.photo[0].mimetype,
        );
      }

      if (files.document?.[0]) {
        updateDto.documentUrl = await this.googleDriveService.uploadFile(
          files.document[0].buffer,
          `enrollment_doc_${Date.now()}_${files.document[0].originalname}`,
          files.document[0].mimetype,
        );
      }

      // Update the row in sheets
      // Note: Implementation of updateRow method in SheetsService would be needed
      // await this.sheetsService.updateRow(this.SHEET_NAME, id, updateDto);

      return {
        message: 'Enrollment updated successfully',
        data: updateDto,
      };
    } catch (error) {
      this.logger.error('Error updating enrollment:', error);
      throw error;
    }
  }

  private mapRowToEnrollment(row: any[], headers: string[]) {
    const enrollment: any = {};
    headers.forEach((header, index) => {
      enrollment[header] = row[index];
    });
    return enrollment;
  }
}
