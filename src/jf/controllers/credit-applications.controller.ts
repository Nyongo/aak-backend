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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCreditApplicationDto } from '../dto/create-credit-application.dto';
import { CreditApplicationsDbService } from '../services/credit-applications-db.service';
import { CreditApplicationsSyncService } from '../services/credit-applications-sync.service';
import { FileUploadService } from '../services/file-upload.service';
import { BackgroundUploadService } from '../services/background-upload.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/credit-applications')
export class CreditApplicationsController {
  private readonly logger = new Logger(CreditApplicationsController.name);
  private readonly CREDIT_APPLICATIONS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_CREDIT_APPLICATIONS_IMAGES_FOLDER_ID;
  private readonly CREDIT_APPLICATIONS_IMAGES_FOLDER_NAME =
    process.env.GOOGLE_DRIVE_CREDIT_APPLICATIONS_IMAGES_FOLDER_NAME;

  constructor(
    private readonly creditApplicationsDbService: CreditApplicationsDbService,
    private readonly creditApplicationsSyncService: CreditApplicationsSyncService,
    private readonly fileUploadService: FileUploadService,
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}

  @Get()
  async getAllApplications() {
    try {
      this.logger.log('Fetching all credit applications from database');
      const applications = await this.creditApplicationsDbService.findAll();

      // Convert database records to original sheet format for frontend compatibility
      const applicationsWithOriginalKeys = applications.map((app) => {
        const convertedApp = {
          ID: app.sheetId || '',
          'Customer Type': app.customerType || '',
          'Borrower ID': app.borrowerId || '',
          'Application Start Date': app.applicationStartDate || '',
          'Credit Type': app.creditType || '',
          'Total Amount Requested': app.totalAmountRequested?.toString() || '',
          'Working Capital Application Number':
            app.workingCapitalApplicationNumber || '',
          'SSL Action Needed': app.sslActionNeeded || '',
          'SSL Action': app.sslAction || '',
          'SSL ID': app.sslId || '',
          'SSL Feedback on Action': app.sslFeedbackOnAction || '',
          'School CRB Available?': app.schoolCrbAvailable || '',
          'Referred By': app.referredBy || '',
          'Current Cost of Capital': app.currentCostOfCapital?.toString() || '',
          'Checks Collected': app.checksCollected?.toString() || '',
          'Checks Needed for Loan': app.checksNeededForLoan?.toString() || '',
          'Photo of Check':
            app.photoOfCheck && app.photoOfCheck.startsWith('/uploads/')
              ? `${this.CREDIT_APPLICATIONS_IMAGES_FOLDER_NAME}/${app.photoOfCheck.split('/').pop()}`
              : app.photoOfCheck || '',
          Status: app.status || '',
          'Comments on Checks': app.commentsOnChecks || '',
          'Created At': app.createdAt?.toISOString() || '',
          Synced: app.synced || false,
        };
        return convertedApp;
      });

      return {
        success: true,
        count: applicationsWithOriginalKeys.length,
        data: applicationsWithOriginalKeys,
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
      this.logger.log(`Fetching credit application with ID: ${id}`);
      const application = await this.creditApplicationsDbService.findById(id);

      if (!application) {
        return { success: false, message: 'Application not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const applicationWithOriginalKeys = {
        ID: application.sheetId || '',
        'Customer Type': application.customerType || '',
        'Borrower ID': application.borrowerId || '',
        'Application Start Date': application.applicationStartDate || '',
        'Credit Type': application.creditType || '',
        'Total Amount Requested':
          application.totalAmountRequested?.toString() || '',
        'Working Capital Application Number':
          application.workingCapitalApplicationNumber || '',
        'SSL Action Needed': application.sslActionNeeded || '',
        'SSL Action': application.sslAction || '',
        'SSL ID': application.sslId || '',
        'SSL Feedback on Action': application.sslFeedbackOnAction || '',
        'School CRB Available?': application.schoolCrbAvailable || '',
        'Referred By': application.referredBy || '',
        'Current Cost of Capital':
          application.currentCostOfCapital?.toString() || '',
        'Checks Collected': application.checksCollected?.toString() || '',
        'Checks Needed for Loan':
          application.checksNeededForLoan?.toString() || '',
        'Photo of Check':
          application.photoOfCheck &&
          application.photoOfCheck.startsWith('/uploads/')
            ? `${this.CREDIT_APPLICATIONS_IMAGES_FOLDER_NAME}/${application.photoOfCheck.split('/').pop()}`
            : application.photoOfCheck || '',
        Status: application.status || '',
        'Comments on Checks': application.commentsOnChecks || '',
        'Created At': application.createdAt?.toISOString() || '',
        Synced: application.synced || false,
      };

      return { success: true, data: applicationWithOriginalKeys };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching application ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('checkPhoto'))
  async createApplication(
    @Body() createDto: CreateCreditApplicationDto,
    @UploadedFile() checkPhoto?: Express.Multer.File,
  ) {
    try {
      this.logger.log('Adding new credit application via Postgres');

      if (!createDto['Borrower ID']) {
        return {
          success: false,
          error: 'Borrower ID is required',
        };
      }

      // Save file locally first for faster response
      let checkPhotoPath = '';
      const now = new Date().toISOString();

      if (checkPhoto) {
        const customName = `check_photo_${createDto['Borrower ID']}`;
        checkPhotoPath = await this.fileUploadService.saveFile(
          checkPhoto,
          'credit-applications',
          customName,
        );
      }

      // Prepare credit application data for Postgres
      const creditApplicationDataForDb = {
        sheetId: `CA-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Generate temporary sheetId
        customerType: 'School',
        borrowerId: createDto['Borrower ID'],
        applicationStartDate: createDto['Application Start Date']
          ? new Date(createDto['Application Start Date']).toISOString()
          : new Date().toISOString(),
        creditType: createDto['Credit Type'],
        totalAmountRequested: createDto['Total Amount Requested']
          ? Number(createDto['Total Amount Requested'])
          : 0,
        workingCapitalApplicationNumber:
          createDto['Working Capital Application Number'] || '',
        sslActionNeeded: createDto['SSL Action Needed']?.toString() || '',
        sslAction: createDto['SSL Action'] || '',
        sslId: createDto['SSL ID'] || '',
        sslFeedbackOnAction: createDto['SSL Feedback on Action'] || '',
        schoolCrbAvailable:
          createDto['School CRB Available']?.toString() || 'FALSE',
        referredBy: createDto['Referred By'] || '',
        currentCostOfCapital: createDto['Current Cost of Capital']
          ? Number(createDto['Current Cost of Capital'])
          : 0,
        checksCollected: createDto['Checks Collected']
          ? Number(createDto['Checks Collected'])
          : 0,
        checksNeededForLoan: createDto['Checks Needed for Loan']
          ? Number(createDto['Checks Needed for Loan'])
          : 0,
        photoOfCheck: checkPhotoPath || '',
        status: createDto['Status'] || 'In Progress',
        commentsOnChecks: createDto['Comments on Checks'] || '',
        synced: false,
        createdAt: now,
      };

      const result = await this.creditApplicationsDbService.create(
        creditApplicationDataForDb,
      );
      this.logger.log(`Credit application added successfully via Postgres`);

      // Queue file upload to Google Drive with credit application ID for database updates
      if (checkPhoto) {
        const customName = `check_photo_${createDto['Borrower ID']}`;
        this.backgroundUploadService.queueFileUpload(
          checkPhotoPath,
          `${customName}_${Date.now()}.${checkPhoto.originalname.split('.').pop()}`,
          this.CREDIT_APPLICATIONS_IMAGES_FOLDER_ID,
          checkPhoto.mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          undefined, // consentId (not applicable)
          undefined, // consentFieldName (not applicable)
          undefined, // referrerId (not applicable)
          undefined, // referrerFieldName (not applicable)
          result.id, // Pass credit application ID
          'photoOfCheck', // Pass field name
        );
      }

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(result.id, result.borrowerId, 'create');

      return {
        success: true,
        data: result,
        message: 'Credit application created successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to add credit application: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Get('search/by-date')
  async getApplicationsByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      this.logger.log(
        `Searching credit applications by date range: ${startDate} to ${endDate}`,
      );
      const applications = await this.creditApplicationsDbService.findAll();

      const start = new Date(startDate);
      const end = new Date(endDate);

      const filteredData = applications.filter((app) => {
        const appDate = new Date(app.applicationStartDate);
        return appDate >= start && appDate <= end;
      });

      // Convert database records to original sheet format for frontend compatibility
      const applicationsWithOriginalKeys = filteredData.map((app) => {
        const convertedApp = {
          ID: app.sheetId || '',
          'Customer Type': app.customerType || '',
          'Borrower ID': app.borrowerId || '',
          'Application Start Date': app.applicationStartDate || '',
          'Credit Type': app.creditType || '',
          'Total Amount Requested': app.totalAmountRequested?.toString() || '',
          'Working Capital Application Number':
            app.workingCapitalApplicationNumber || '',
          'SSL Action Needed': app.sslActionNeeded || '',
          'SSL Action': app.sslAction || '',
          'SSL ID': app.sslId || '',
          'SSL Feedback on Action': app.sslFeedbackOnAction || '',
          'School CRB Available?': app.schoolCrbAvailable || '',
          'Referred By': app.referredBy || '',
          'Current Cost of Capital': app.currentCostOfCapital?.toString() || '',
          'Checks Collected': app.checksCollected?.toString() || '',
          'Checks Needed for Loan': app.checksNeededForLoan?.toString() || '',
          'Photo of Check':
            app.photoOfCheck && app.photoOfCheck.startsWith('/uploads/')
              ? `${this.CREDIT_APPLICATIONS_IMAGES_FOLDER_NAME}/${app.photoOfCheck.split('/').pop()}`
              : app.photoOfCheck || '',
          Status: app.status || '',
          'Comments on Checks': app.commentsOnChecks || '',
          'Created At': app.createdAt?.toISOString() || '',
          Synced: app.synced || false,
        };
        return convertedApp;
      });

      return {
        success: true,
        count: applicationsWithOriginalKeys.length,
        data: applicationsWithOriginalKeys,
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
      const applications =
        await this.creditApplicationsDbService.findByBorrowerId(borrowerId);

      // Convert database records to original sheet format for frontend compatibility
      const applicationsWithOriginalKeys = applications.map((app) => {
        const convertedApp = {
          ID: app.sheetId || '',
          'Customer Type': app.customerType || '',
          'Borrower ID': app.borrowerId || '',
          'Application Start Date': app.applicationStartDate || '',
          'Credit Type': app.creditType || '',
          'Total Amount Requested': app.totalAmountRequested?.toString() || '',
          'Working Capital Application Number':
            app.workingCapitalApplicationNumber || '',
          'SSL Action Needed': app.sslActionNeeded || '',
          'SSL Action': app.sslAction || '',
          'SSL ID': app.sslId || '',
          'SSL Feedback on Action': app.sslFeedbackOnAction || '',
          'School CRB Available?': app.schoolCrbAvailable || '',
          'Referred By': app.referredBy || '',
          'Current Cost of Capital': app.currentCostOfCapital?.toString() || '',
          'Checks Collected': app.checksCollected?.toString() || '',
          'Checks Needed for Loan': app.checksNeededForLoan?.toString() || '',
          'Photo of Check':
            app.photoOfCheck && app.photoOfCheck.startsWith('/uploads/')
              ? `${this.CREDIT_APPLICATIONS_IMAGES_FOLDER_NAME}/${app.photoOfCheck.split('/').pop()}`
              : app.photoOfCheck || '',
          Status: app.status || '',
          'Comments on Checks': app.commentsOnChecks || '',
          'Created At': app.createdAt?.toISOString() || '',
          Synced: app.synced || false,
        };
        return convertedApp;
      });

      return {
        success: true,
        count: applicationsWithOriginalKeys.length,
        data: applicationsWithOriginalKeys,
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
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('checkPhoto'))
  async updateApplication(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateCreditApplicationDto>,
    @UploadedFile() checkPhoto?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating credit application with ID: ${id}`);

      // Find the existing credit application by sheetId (since the id parameter is the sheetId)
      const existingCreditApplication =
        await this.creditApplicationsDbService.findBySheetId(id);
      if (!existingCreditApplication) {
        return { success: false, error: 'Credit application not found' };
      }

      // Handle check photo upload if provided
      let checkPhotoPath = existingCreditApplication.photoOfCheck || '';

      if (checkPhoto) {
        const customName = `check_photo_${updateData['Borrower ID'] || existingCreditApplication.borrowerId}`;
        checkPhotoPath = await this.fileUploadService.saveFile(
          checkPhoto,
          'credit-applications',
          customName,
        );

        // Queue file upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          checkPhotoPath,
          `${customName}_${Date.now()}.${checkPhoto.originalname.split('.').pop()}`,
          this.CREDIT_APPLICATIONS_IMAGES_FOLDER_ID,
          checkPhoto.mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          undefined, // consentId (not applicable)
          undefined, // consentFieldName (not applicable)
          undefined, // referrerId (not applicable)
          undefined, // referrerFieldName (not applicable)
          existingCreditApplication.id, // Pass credit application ID
          'photoOfCheck', // Pass field name
        );
      }

      // Prepare update data
      const updateDataForDb = {
        customerType: 'School',
        borrowerId:
          updateData['Borrower ID'] || existingCreditApplication.borrowerId,
        applicationStartDate: updateData['Application Start Date']
          ? new Date(updateData['Application Start Date']).toISOString()
          : existingCreditApplication.applicationStartDate,
        creditType:
          updateData['Credit Type'] || existingCreditApplication.creditType,
        totalAmountRequested: updateData['Total Amount Requested']
          ? Number(updateData['Total Amount Requested']).toString()
          : existingCreditApplication.totalAmountRequested,
        workingCapitalApplicationNumber:
          updateData['Working Capital Application Number'] ||
          existingCreditApplication.workingCapitalApplicationNumber,
        sslActionNeeded:
          updateData['SSL Action Needed']?.toString() ||
          existingCreditApplication.sslActionNeeded,
        sslAction:
          updateData['SSL Action'] || existingCreditApplication.sslAction,
        sslId: updateData['SSL ID'] || existingCreditApplication.sslId || '',
        sslFeedbackOnAction:
          updateData['SSL Feedback on Action'] ||
          existingCreditApplication.sslFeedbackOnAction,
        schoolCrbAvailable:
          updateData['School CRB Available']?.toString() ||
          existingCreditApplication.schoolCrbAvailable,
        referredBy:
          updateData['Referred By'] || existingCreditApplication.referredBy,
        currentCostOfCapital: updateData['Current Cost of Capital']
          ? Number(updateData['Current Cost of Capital'])
          : existingCreditApplication.currentCostOfCapital,
        checksCollected: updateData['Checks Collected']
          ? Number(updateData['Checks Collected'])
          : existingCreditApplication.checksCollected,
        checksNeededForLoan: updateData['Checks Needed for Loan']
          ? Number(updateData['Checks Needed for Loan'])
          : existingCreditApplication.checksNeededForLoan,
        photoOfCheck: checkPhotoPath,
        status:
          updateData['Status'] ||
          existingCreditApplication.status ||
          'In Progress',
        commentsOnChecks:
          updateData['Comments on Checks'] ||
          existingCreditApplication.commentsOnChecks,
        synced: false, // Mark as unsynced to trigger sync
      };

      const result = await this.creditApplicationsDbService.update(
        id,
        updateDataForDb,
      );
      this.logger.log(`Credit application updated successfully via Postgres`);

      // Trigger background sync
      this.triggerBackgroundSync(result.id, result.borrowerId, 'update');

      return {
        success: true,
        data: result,
        message: 'Credit application updated successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to update credit application: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Manual sync endpoints
   */
  @Post('sync/:id')
  async syncApplicationById(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync requested for credit application: ${id}`);
      const application = await this.creditApplicationsDbService.findById(id);

      if (!application) {
        return { success: false, error: 'Credit application not found' };
      }

      const result =
        await this.creditApplicationsSyncService.syncCreditApplicationById(
          application.id,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync credit application: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllApplications() {
    try {
      this.logger.log('Manual sync all credit applications requested');
      const result = await this.creditApplicationsSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync all credit applications: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-borrower/:borrowerId')
  async syncApplicationsByBorrower(@Param('borrowerId') borrowerId: string) {
    try {
      this.logger.log(`Manual sync requested for borrower: ${borrowerId}`);
      const result =
        await this.creditApplicationsSyncService.syncByBorrowerId(borrowerId);
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync credit applications for borrower: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync
   */
  private async triggerBackgroundSync(
    dbId: number,
    borrowerId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for credit application ${dbId} (${operation})`,
      );
      await this.creditApplicationsSyncService.syncCreditApplicationById(dbId);
      this.logger.log(
        `Background sync completed for credit application ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Background sync failed for credit application ${dbId}:`,
        error,
      );
    }
  }
}
