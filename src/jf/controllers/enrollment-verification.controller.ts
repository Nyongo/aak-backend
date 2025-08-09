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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateEnrollmentVerificationDto } from '../dto/create-enrollment-verification.dto';
import { EnrollmentVerificationDbService } from '../services/enrollment-verification-db.service';
import { EnrollmentVerificationSyncService } from '../services/enrollment-verification-sync.service';
import { FileUploadService } from '../services/file-upload.service';
import { BackgroundUploadService } from '../services/background-upload.service';
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
  private readonly GOOGLE_DRIVE_ENROLLMENT_REPORTS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_ENROLLMENT_REPORTS_IMAGES_FOLDER_ID;
  private readonly GOOGLE_DRIVE_ENROLLMENT_REPORTS_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_ENROLLMENT_REPORTS_FILES_FOLDER_ID;

  constructor(
    private readonly enrollmentVerificationDbService: EnrollmentVerificationDbService,
    private readonly enrollmentVerificationSyncService: EnrollmentVerificationSyncService,
    private readonly fileUploadService: FileUploadService,
    private readonly backgroundUploadService: BackgroundUploadService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'enrollmentVerification', maxCount: 1 },
      { name: 'enrollmentReport', maxCount: 1 },
    ]),
  )
  async createEnrollmentVerification(
    @Body()
    createDto: CreateEnrollmentVerificationDto,
    @UploadedFiles()
    files: {
      enrollmentVerification?: Express.Multer.File[];
      enrollmentReport?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(
        `Creating enrollment verification for application: ${createDto.creditApplicationId}`,
      );

      if (!createDto.creditApplicationId) {
        return {
          success: false,
          error: 'Credit Application ID is required',
        };
      }

      // Save files locally first for faster response
      let verificationPath = '';
      let reportPath = '';
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

      if (files.enrollmentVerification?.[0]) {
        const customName = `verification_file_${createDto.creditApplicationId}`;
        verificationPath = await this.fileUploadService.saveFile(
          files.enrollmentVerification[0],
          'enrollment-verifications',
          customName,
        );
      }

      if (files.enrollmentReport?.[0]) {
        const customName = `enr_report_file_${createDto.creditApplicationId}`;
        reportPath = await this.fileUploadService.saveFile(
          files.enrollmentReport[0],
          'enrollment-verifications',
          customName,
        );
      }

      // Prepare enrollment verification data for Postgres
      const enrollmentVerificationDataForDb = {
        sheetId: `ENR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Generate temporary sheetId
        creditApplicationId: createDto.creditApplicationId,
        subCountyEnrollmentReport: verificationPath || '',
        enrollmentReport: reportPath || '',
        numberOfStudentsThisYear: Number(createDto.numberOfStudentsThisYear),
        numberOfStudentsLastYear: Number(createDto.numberOfStudentsLastYear),
        numberOfStudentsTwoYearsAgo: Number(
          createDto.numberOfStudentsTwoYearsAgo,
        ),
        synced: false,
        createdAt: new Date(createdAt),
      };

      const result = await this.enrollmentVerificationDbService.create(
        enrollmentVerificationDataForDb,
      );
      this.logger.log(
        `Enrollment verification created successfully via Postgres`,
      );

      // Queue file uploads to Google Drive with enrollment verification ID for database updates
      if (files.enrollmentVerification?.[0]) {
        const customName = `verification_file_${createDto.creditApplicationId}`;
        this.backgroundUploadService.queueFileUpload(
          verificationPath,
          `${customName}_${Date.now()}.${files.enrollmentVerification[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_IMAGES_FOLDER_ID,
          files.enrollmentVerification[0].mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          undefined, // consentId (not applicable)
          undefined, // consentFieldName (not applicable)
          undefined, // referrerId (not applicable)
          undefined, // referrerFieldName (not applicable)
          undefined, // creditApplicationId (not applicable)
          undefined, // creditApplicationFieldName (not applicable)
          undefined, // activeDebtId (not applicable)
          undefined, // activeDebtFieldName (not applicable)
          undefined, // feePlanId (not applicable)
          undefined, // feePlanFieldName (not applicable)
          result.id, // Pass enrollment verification ID
          'subCountyEnrollmentReport', // Pass field name
        );
      }

      if (files.enrollmentReport?.[0]) {
        const customName = `enr_report_file_${createDto.creditApplicationId}`;
        this.backgroundUploadService.queueFileUpload(
          reportPath,
          `${customName}_${Date.now()}.${files.enrollmentReport[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_FILES_FOLDER_ID,
          files.enrollmentReport[0].mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          undefined, // consentId (not applicable)
          undefined, // consentFieldName (not applicable)
          undefined, // referrerId (not applicable)
          undefined, // referrerFieldName (not applicable)
          undefined, // creditApplicationId (not applicable)
          undefined, // creditApplicationFieldName (not applicable)
          undefined, // activeDebtId (not applicable)
          undefined, // activeDebtFieldName (not applicable)
          undefined, // feePlanId (not applicable)
          undefined, // feePlanFieldName (not applicable)
          result.id, // Pass enrollment verification ID
          'enrollmentReport', // Pass field name
        );
      }

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'create',
      );

      return {
        success: true,
        data: result,
        message: 'Enrollment verification record created successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to create enrollment verification: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync for enrollment verification
   */
  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for enrollment verification ${dbId} (${operation})`,
      );
      await this.enrollmentVerificationSyncService.syncEnrollmentVerificationById(
        dbId,
      );
      this.logger.log(
        `Background sync triggered successfully for enrollment verification ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger background sync for enrollment verification ${dbId}: ${error}`,
      );
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

      const enrollmentVerifications =
        await this.enrollmentVerificationDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      // Convert database records to original sheet format for frontend compatibility
      const enrollmentVerificationsWithOriginalKeys =
        enrollmentVerifications.map((enrollmentVerification) => {
          const convertedEnrollmentVerification = {
            ID: enrollmentVerification.sheetId || '',
            'Credit Application ID':
              enrollmentVerification.creditApplicationId || '',
            'Sub County Enrollment Report':
              enrollmentVerification.subCountyEnrollmentReport || '',
            'Enrollment Report': enrollmentVerification.enrollmentReport || '',
            'Number of Students This Year':
              enrollmentVerification.numberOfStudentsThisYear?.toString() || '',
            'Number of students last year':
              enrollmentVerification.numberOfStudentsLastYear?.toString() || '',
            'Number of students two years ago':
              enrollmentVerification.numberOfStudentsTwoYearsAgo?.toString() ||
              '',
            'Created At': enrollmentVerification.createdAt?.toISOString() || '',
            Synced: enrollmentVerification.synced || false,
          };
          return convertedEnrollmentVerification;
        });

      // Add Google Drive links for document columns
      const documentColumns = [
        'Enrollment Report',
        'Sub County Enrollment Report',
      ];
      const enrollmentVerificationsWithLinks = await Promise.all(
        enrollmentVerificationsWithOriginalKeys.map(
          async (enrollmentVerification) => {
            const enrollmentVerificationWithLinks = {
              ...enrollmentVerification,
            };
            for (const column of documentColumns) {
              if (enrollmentVerification[column]) {
                let folderId = '';
                if (column === 'Sub County Enrollment Report') {
                  folderId =
                    this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_IMAGES_FOLDER_ID;
                } else if (column === 'Enrollment Report') {
                  folderId =
                    this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_FILES_FOLDER_ID;
                }
                const filename = enrollmentVerification[column]
                  .split('/')
                  .pop();
                const fileLink = await this.googleDriveService.getFileLink(
                  filename,
                  folderId,
                );
                enrollmentVerificationWithLinks[column] = fileLink;
              }
            }
            return enrollmentVerificationWithLinks;
          },
        ),
      );

      return {
        success: true,
        count: enrollmentVerificationsWithLinks.length,
        data: enrollmentVerificationsWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching enrollment verifications for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllVerifications() {
    try {
      this.logger.log('Fetching all enrollment verifications');
      const enrollmentVerifications =
        await this.enrollmentVerificationDbService.findAll();

      // Convert database records to original sheet format for frontend compatibility
      const enrollmentVerificationsWithOriginalKeys =
        enrollmentVerifications.map((enrollmentVerification) => {
          const convertedEnrollmentVerification = {
            ID: enrollmentVerification.sheetId || '',
            'Credit Application ID':
              enrollmentVerification.creditApplicationId || '',
            'Sub County Enrollment Report':
              enrollmentVerification.subCountyEnrollmentReport || '',
            'Enrollment Report': enrollmentVerification.enrollmentReport || '',
            'Number of Students This Year':
              enrollmentVerification.numberOfStudentsThisYear?.toString() || '',
            'Number of students last year':
              enrollmentVerification.numberOfStudentsLastYear?.toString() || '',
            'Number of students two years ago':
              enrollmentVerification.numberOfStudentsTwoYearsAgo?.toString() ||
              '',
            'Created At': enrollmentVerification.createdAt?.toISOString() || '',
            Synced: enrollmentVerification.synced || false,
          };
          return convertedEnrollmentVerification;
        });

      return {
        success: true,
        count: enrollmentVerificationsWithOriginalKeys.length,
        data: enrollmentVerificationsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all enrollment verifications: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getVerificationById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching enrollment verification with ID: ${id}`);
      const enrollmentVerification =
        await this.enrollmentVerificationDbService.findById(id);

      if (!enrollmentVerification) {
        return { success: false, message: 'Enrollment verification not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const enrollmentVerificationWithOriginalKeys = {
        ID: enrollmentVerification.sheetId || '',
        'Credit Application ID':
          enrollmentVerification.creditApplicationId || '',
        'Sub County Enrollment Report':
          enrollmentVerification.subCountyEnrollmentReport || '',
        'Enrollment Report': enrollmentVerification.enrollmentReport || '',
        'Number of Students This Year':
          enrollmentVerification.numberOfStudentsThisYear?.toString() || '',
        'Number of students last year':
          enrollmentVerification.numberOfStudentsLastYear?.toString() || '',
        'Number of students two years ago':
          enrollmentVerification.numberOfStudentsTwoYearsAgo?.toString() || '',
        'Created At': enrollmentVerification.createdAt?.toISOString() || '',
        Synced: enrollmentVerification.synced || false,
      };

      return { success: true, data: enrollmentVerificationWithOriginalKeys };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching enrollment verification ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Post('sync/:id')
  async syncEnrollmentVerificationById(@Param('id') id: string) {
    try {
      this.logger.log(
        `Manual sync requested for enrollment verification: ${id}`,
      );
      const result =
        await this.enrollmentVerificationSyncService.syncEnrollmentVerificationById(
          parseInt(id),
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync enrollment verification ${id}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllEnrollmentVerifications() {
    try {
      this.logger.log('Manual sync requested for all enrollment verifications');
      const result =
        await this.enrollmentVerificationSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync all enrollment verifications: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncEnrollmentVerificationsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync requested for enrollment verifications by credit application: ${creditApplicationId}`,
      );
      const result =
        await this.enrollmentVerificationSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync enrollment verifications for credit application ${creditApplicationId}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'enrollmentVerification', maxCount: 1 },
      { name: 'enrollmentReport', maxCount: 1 },
    ]),
  )
  async updateEnrollmentVerification(
    @Param('id') id: string,
    @Body()
    updateDto: Partial<CreateEnrollmentVerificationDto>,
    @UploadedFiles()
    files: {
      enrollmentVerification?: Express.Multer.File[];
      enrollmentReport?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating enrollment verification with ID: ${id}`);

      // Find the existing enrollment verification by sheetId (since the id parameter is the sheetId)
      const existingEnrollmentVerification =
        await this.enrollmentVerificationDbService.findBySheetId(id);
      if (!existingEnrollmentVerification) {
        return { success: false, error: 'Enrollment verification not found' };
      }

      this.logger.log(
        `Updating enrollment verification with sheetId: ${id}, database ID: ${existingEnrollmentVerification.id}`,
      );

      // Handle file uploads if provided
      let verificationPath =
        existingEnrollmentVerification.subCountyEnrollmentReport || '';
      let reportPath = existingEnrollmentVerification.enrollmentReport || '';

      if (files.enrollmentVerification?.[0]) {
        const customName = `verification_file_${updateDto.creditApplicationId || existingEnrollmentVerification.creditApplicationId}`;
        this.logger.log(
          `Updating enrollment verification ${existingEnrollmentVerification.id} with new verification file upload`,
        );
        verificationPath = await this.fileUploadService.saveFile(
          files.enrollmentVerification[0],
          'enrollment-verifications',
          customName,
        );

        // Queue verification file upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          verificationPath,
          `${customName}_${Date.now()}.${files.enrollmentVerification[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_IMAGES_FOLDER_ID,
          files.enrollmentVerification[0].mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          undefined, // consentId (not applicable)
          undefined, // consentFieldName (not applicable)
          undefined, // referrerId (not applicable)
          undefined, // referrerFieldName (not applicable)
          undefined, // creditApplicationId (not applicable)
          undefined, // creditApplicationFieldName (not applicable)
          undefined, // activeDebtId (not applicable)
          undefined, // activeDebtFieldName (not applicable)
          undefined, // feePlanId (not applicable)
          undefined, // feePlanFieldName (not applicable)
          existingEnrollmentVerification.id, // Pass enrollment verification ID
          'subCountyEnrollmentReport', // Pass field name
        );
        this.logger.log(
          `Verification file upload queued for enrollment verification update ${existingEnrollmentVerification.id}`,
        );
      }

      if (files.enrollmentReport?.[0]) {
        const customName = `enr_report_file_${updateDto.creditApplicationId || existingEnrollmentVerification.creditApplicationId}`;
        this.logger.log(
          `Updating enrollment verification ${existingEnrollmentVerification.id} with new report file upload`,
        );
        reportPath = await this.fileUploadService.saveFile(
          files.enrollmentReport[0],
          'enrollment-verifications',
          customName,
        );

        // Queue report file upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          reportPath,
          `${customName}_${Date.now()}.${files.enrollmentReport[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_ENROLLMENT_REPORTS_FILES_FOLDER_ID,
          files.enrollmentReport[0].mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          undefined, // consentId (not applicable)
          undefined, // consentFieldName (not applicable)
          undefined, // referrerId (not applicable)
          undefined, // referrerFieldName (not applicable)
          undefined, // creditApplicationId (not applicable)
          undefined, // creditApplicationFieldName (not applicable)
          undefined, // activeDebtId (not applicable)
          undefined, // activeDebtFieldName (not applicable)
          undefined, // feePlanId (not applicable)
          undefined, // feePlanFieldName (not applicable)
          existingEnrollmentVerification.id, // Pass enrollment verification ID
          'enrollmentReport', // Pass field name
        );
        this.logger.log(
          `Report file upload queued for enrollment verification update ${existingEnrollmentVerification.id}`,
        );
      }

      // Prepare update data
      const updateDataForDb = {
        creditApplicationId:
          updateDto.creditApplicationId ||
          existingEnrollmentVerification.creditApplicationId,
        subCountyEnrollmentReport: verificationPath,
        enrollmentReport: reportPath,
        numberOfStudentsThisYear:
          updateDto.numberOfStudentsThisYear !== undefined
            ? Number(updateDto.numberOfStudentsThisYear)
            : existingEnrollmentVerification.numberOfStudentsThisYear,
        numberOfStudentsLastYear:
          updateDto.numberOfStudentsLastYear !== undefined
            ? Number(updateDto.numberOfStudentsLastYear)
            : existingEnrollmentVerification.numberOfStudentsLastYear,
        numberOfStudentsTwoYearsAgo:
          updateDto.numberOfStudentsTwoYearsAgo !== undefined
            ? Number(updateDto.numberOfStudentsTwoYearsAgo)
            : existingEnrollmentVerification.numberOfStudentsTwoYearsAgo,
        synced: false, // Mark as unsynced to trigger sync
      };

      const result = await this.enrollmentVerificationDbService.update(
        id,
        updateDataForDb,
      );
      this.logger.log(
        `Enrollment verification updated successfully via Postgres`,
      );

      // Trigger background sync
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'update',
      );

      return {
        success: true,
        data: result,
        message: 'Enrollment verification updated successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to update enrollment verification: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
