import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  Logger,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateFeePlanDto } from '../dto/create-fee-plan.dto';
import { FeePlansDbService } from '../services/fee-plans-db.service';
import { FeePlansSyncService } from '../services/fee-plans-sync.service';
import { FileUploadService } from '../services/file-upload.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/fee-plans')
export class FeePlansController {
  private readonly logger = new Logger(FeePlansController.name);
  private readonly FEE_PLAN_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_FEE_PLANS_IMAGES_FOLDER_ID;
  private readonly FEE_PLAN_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_FEE_PLANS_FILES_FOLDER_ID;
  private readonly FEE_PLAN_IMAGES_FOLDER_NAME =
    process.env.GOOGLE_DRIVE_FEE_PLANS_IMAGES_FOLDER_NAME;
  private readonly FEE_PLAN_FILES_FOLDER_NAME =
    process.env.GOOGLE_DRIVE_FEE_PLANS_FILES_FOLDER_NAME;

  constructor(
    private readonly feePlansDbService: FeePlansDbService,
    private readonly feePlansSyncService: FeePlansSyncService,
    private readonly fileUploadService: FileUploadService,
    private readonly backgroundUploadService: BackgroundUploadService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('by-application/:creditApplicationId')
  async getFeePlansByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Fetching fee plans for credit application: ${creditApplicationId}`,
      );
      const feePlans =
        await this.feePlansDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      // Convert database records to original sheet format for frontend compatibility
      const feePlansWithOriginalKeys = feePlans.map((feePlan) => {
        const convertedFeePlan = {
          ID: feePlan.sheetId || '',
          'Credit Application ID': feePlan.creditApplicationId || '',
          'School Year': feePlan.schoolYear || '',
          Photo: feePlan.photo || '',
          File: feePlan.file || '',
          'Created At': feePlan.createdAt?.toISOString() || '',
          Synced: feePlan.synced || false,
        };
        return convertedFeePlan;
      });

      // Add Google Drive links for document columns
      const documentColumns = ['Photo', 'File'];
      const feePlansWithLinks = await Promise.all(
        feePlansWithOriginalKeys.map(async (feePlan) => {
          const feePlanWithLinks = { ...feePlan };
          for (const column of documentColumns) {
            if (feePlan[column]) {
              let folderId = '';
              if (column === 'Photo') {
                folderId = this.FEE_PLAN_IMAGES_FOLDER_ID;
              } else if (column === 'File') {
                folderId = this.FEE_PLAN_FILES_FOLDER_ID;
              }
              const filename = feePlan[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                folderId,
              );
              feePlanWithLinks[column] = fileLink;
            }
          }
          return feePlanWithLinks;
        }),
      );

      return {
        success: true,
        count: feePlansWithLinks.length,
        data: feePlansWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching fee plans for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  async addFeePlan(
    @Body() createDto: CreateFeePlanDto,
    @UploadedFiles()
    files: {
      photo?: Express.Multer.File[];
      file?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(
        `Adding new fee plan for application: ${createDto['Credit Application ID']}`,
      );

      if (!createDto['Credit Application ID']) {
        return {
          success: false,
          error: 'Credit Application ID is required',
        };
      }

      // Save files locally first for faster response
      let photoPath = '';
      let filePath = '';
      const now = new Date().toISOString();

      if (files.photo?.[0]) {
        const customName = `fee_plan_photo_${createDto['Credit Application ID']}`;
        photoPath = await this.fileUploadService.saveFile(
          files.photo[0],
          'fee-plans',
          customName,
        );
      }

      if (files.file?.[0]) {
        const customName = `fee_plan_file_${createDto['Credit Application ID']}`;
        filePath = await this.fileUploadService.saveFile(
          files.file[0],
          'fee-plans',
          customName,
        );
      }

      // Prepare fee plan data for Postgres
      const feePlanDataForDb = {
        sheetId: `FP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Generate temporary sheetId
        creditApplicationId: createDto['Credit Application ID'],
        schoolYear: createDto['School Year'],
        photo: photoPath || '',
        file: filePath || '',
        synced: false,
        createdAt: now,
      };

      const result = await this.feePlansDbService.create(feePlanDataForDb);
      this.logger.log(`Fee plan added successfully via Postgres`);

      // Queue file uploads to Google Drive with fee plan ID for database updates
      if (files.photo?.[0]) {
        const customName = `fee_plan_photo_${createDto['Credit Application ID']}`;
        this.backgroundUploadService.queueFileUpload(
          photoPath,
          `${customName}_${Date.now()}.${files.photo[0].originalname.split('.').pop()}`,
          this.FEE_PLAN_IMAGES_FOLDER_ID,
          files.photo[0].mimetype,
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
          result.id, // Pass fee plan ID
          'photo', // Pass field name
        );
      }

      if (files.file?.[0]) {
        const customName = `fee_plan_file_${createDto['Credit Application ID']}`;
        this.backgroundUploadService.queueFileUpload(
          filePath,
          `${customName}_${Date.now()}.${files.file[0].originalname.split('.').pop()}`,
          this.FEE_PLAN_FILES_FOLDER_ID,
          files.file[0].mimetype,
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
          result.id, // Pass fee plan ID
          'file', // Pass field name
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
        message: 'Fee plan added successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to add fee plan: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync for fee plan
   */
  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for fee plan ${dbId} (${operation})`,
      );
      await this.feePlansSyncService.syncFeePlanById(dbId);
      this.logger.log(
        `Background sync triggered successfully for fee plan ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger background sync for fee plan ${dbId}: ${error}`,
      );
    }
  }

  @Get()
  async getAllFeePlans() {
    try {
      this.logger.log('Fetching all fee plans');
      const feePlans = await this.feePlansDbService.findAll();

      // Convert database records to original sheet format for frontend compatibility
      const feePlansWithOriginalKeys = feePlans.map((feePlan) => {
        const convertedFeePlan = {
          ID: feePlan.sheetId || '',
          'Credit Application ID': feePlan.creditApplicationId || '',
          'School Year': feePlan.schoolYear || '',
          Photo: feePlan.photo || '',
          File: feePlan.file || '',
          'Created At': feePlan.createdAt?.toISOString() || '',
          Synced: feePlan.synced || false,
        };
        return convertedFeePlan;
      });

      // Add Google Drive links for document columns
      const documentColumns = ['Photo', 'File'];
      const feePlansWithLinks = await Promise.all(
        feePlansWithOriginalKeys.map(async (feePlan) => {
          const feePlanWithLinks = { ...feePlan };
          for (const column of documentColumns) {
            if (feePlan[column]) {
              let folderId = '';
              if (column === 'Photo') {
                folderId = this.FEE_PLAN_IMAGES_FOLDER_ID;
              } else if (column === 'File') {
                folderId = this.FEE_PLAN_FILES_FOLDER_ID;
              }
              const filename = feePlan[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                folderId,
              );
              feePlanWithLinks[column] = fileLink;
            }
          }
          return feePlanWithLinks;
        }),
      );

      return {
        success: true,
        count: feePlansWithLinks.length,
        data: feePlansWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all fee plans: ${apiError.message}`);
      throw error;
    }
  }

  @Get(':id')
  async getFeePlanById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching fee plan with ID: ${id}`);
      const feePlan = await this.feePlansDbService.findById(id);

      if (!feePlan) {
        return { success: false, message: 'Fee plan not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const feePlanWithOriginalKeys = {
        ID: feePlan.sheetId || '',
        'Credit Application ID': feePlan.creditApplicationId || '',
        'School Year': feePlan.schoolYear || '',
        Photo: feePlan.photo || '',
        File: feePlan.file || '',
        'Created At': feePlan.createdAt?.toISOString() || '',
        Synced: feePlan.synced || false,
      };

      // Add Google Drive links for document columns
      const documentColumns = ['Photo', 'File'];
      const feePlanWithLinks = { ...feePlanWithOriginalKeys };
      for (const column of documentColumns) {
        if (feePlanWithLinks[column]) {
          let folderId = '';
          if (column === 'Photo') {
            folderId = this.FEE_PLAN_IMAGES_FOLDER_ID;
          } else if (column === 'File') {
            folderId = this.FEE_PLAN_FILES_FOLDER_ID;
          }
          const filename = feePlanWithLinks[column].split('/').pop();
          const fileLink = await this.googleDriveService.getFileLink(
            filename,
            folderId,
          );
          feePlanWithLinks[column] = fileLink;
        }
      }

      return { success: true, data: feePlanWithLinks };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching fee plan ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Post('sync/:id')
  async syncFeePlanById(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync requested for fee plan: ${id}`);
      const result = await this.feePlansSyncService.syncFeePlanById(
        parseInt(id),
      );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to sync fee plan ${id}: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllFeePlans() {
    try {
      this.logger.log('Manual sync requested for all fee plans');
      const result = await this.feePlansSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to sync all fee plans: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncFeePlansByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync requested for fee plans by credit application: ${creditApplicationId}`,
      );
      const result =
        await this.feePlansSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync fee plans for credit application ${creditApplicationId}: ${apiError.message}`,
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
      { name: 'photo', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  async updateFeePlan(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateFeePlanDto>,
    @UploadedFiles()
    files: {
      photo?: Express.Multer.File[];
      file?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating fee plan with ID: ${id}`);

      // Find the existing fee plan by sheetId (since the id parameter is the sheetId)
      const existingFeePlan = await this.feePlansDbService.findBySheetId(id);
      if (!existingFeePlan) {
        return { success: false, error: 'Fee plan not found' };
      }

      this.logger.log(
        `Updating fee plan with sheetId: ${id}, database ID: ${existingFeePlan.id}, current photo: ${existingFeePlan.photo}, current file: ${existingFeePlan.file}`,
      );

      // Handle file uploads if provided
      let photoPath = existingFeePlan.photo || '';
      let filePath = existingFeePlan.file || '';

      if (files.photo?.[0]) {
        const customName = `fee_plan_photo_${updateData['Credit Application ID'] || existingFeePlan.creditApplicationId}`;
        this.logger.log(
          `Updating fee plan ${existingFeePlan.id} with new photo upload`,
        );
        photoPath = await this.fileUploadService.saveFile(
          files.photo[0],
          'fee-plans',
          customName,
        );

        // Queue photo upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          photoPath,
          `${customName}_${Date.now()}.${files.photo[0].originalname.split('.').pop()}`,
          this.FEE_PLAN_IMAGES_FOLDER_ID,
          files.photo[0].mimetype,
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
          existingFeePlan.id, // Pass fee plan ID
          'photo', // Pass field name
        );
        this.logger.log(
          `Photo upload queued for fee plan update ${existingFeePlan.id}`,
        );
      }

      if (files.file?.[0]) {
        const customName = `fee_plan_file_${updateData['Credit Application ID'] || existingFeePlan.creditApplicationId}`;
        this.logger.log(
          `Updating fee plan ${existingFeePlan.id} with new file upload`,
        );
        filePath = await this.fileUploadService.saveFile(
          files.file[0],
          'fee-plans',
          customName,
        );

        // Queue file upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          filePath,
          `${customName}_${Date.now()}.${files.file[0].originalname.split('.').pop()}`,
          this.FEE_PLAN_FILES_FOLDER_ID,
          files.file[0].mimetype,
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
          existingFeePlan.id, // Pass fee plan ID
          'file', // Pass field name
        );
        this.logger.log(
          `File upload queued for fee plan update ${existingFeePlan.id}`,
        );
      }

      // Prepare update data
      const updateDataForDb = {
        creditApplicationId:
          updateData['Credit Application ID'] ||
          existingFeePlan.creditApplicationId,
        schoolYear: updateData['School Year'] || existingFeePlan.schoolYear,
        photo: photoPath,
        file: filePath,
        synced: false, // Mark as unsynced to trigger sync
      };

      const result = await this.feePlansDbService.update(id, updateDataForDb);
      this.logger.log(`Fee plan updated successfully via Postgres`);

      // Trigger background sync
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'update',
      );

      return {
        success: true,
        data: result,
        message: 'Fee plan updated successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to update fee plan: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
