import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  Logger,
  Put,
  Delete,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { AssetTitleDbService } from '../services/asset-title-db.service';
import { AssetTitleSyncService } from '../services/asset-title-sync.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { CreateAssetTitleDto } from '../dto/create-asset-title.dto';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/asset-titles')
export class AssetTitlesController {
  private readonly logger = new Logger(AssetTitlesController.name);
  private readonly SHEET_NAME = 'Asset Titles';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly assetTitleDbService: AssetTitleDbService,
    private readonly assetTitleSyncService: AssetTitleSyncService,
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'Logbook Photo', maxCount: 1 },
      { name: 'Title Deed Photo', maxCount: 1 },
      { name: 'Full Title Deed', maxCount: 1 },
      { name: "Evaluator's Report", maxCount: 1 },
    ]),
  )
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields for file uploads
      transform: true,
    }),
  )
  async createAssetTitle(
    @Body() createDto: CreateAssetTitleDto,
    @UploadedFiles()
    files: {
      'Logbook Photo'?: Express.Multer.File[];
      'Title Deed Photo'?: Express.Multer.File[];
      'Full Title Deed'?: Express.Multer.File[];
      "Evaluator's Report"?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log('Creating asset title record');

      // Generate unique ID for the asset title
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 8);
      const id = `AT-${timestamp}-${random}`;

      // Upload files if provided and get Google Drive URLs
      const fileUrls = {
        'Logbook Photo': '',
        'Title Deed Photo': '',
        'Full Title Deed': '',
        "Evaluator's Report": '',
      };

      if (files['Logbook Photo']?.[0]) {
        const uploadedFile = await this.googleDriveService.uploadFile(
          files['Logbook Photo'][0].buffer,
          files['Logbook Photo'][0].originalname,
          files['Logbook Photo'][0].mimetype,
        );
        fileUrls['Logbook Photo'] = uploadedFile;
      }

      if (files['Title Deed Photo']?.[0]) {
        const uploadedFile = await this.googleDriveService.uploadFile(
          files['Title Deed Photo'][0].buffer,
          files['Title Deed Photo'][0].originalname,
          files['Title Deed Photo'][0].mimetype,
        );
        fileUrls['Title Deed Photo'] = uploadedFile;
      }

      if (files['Full Title Deed']?.[0]) {
        const uploadedFile = await this.googleDriveService.uploadFile(
          files['Full Title Deed'][0].buffer,
          files['Full Title Deed'][0].originalname,
          files['Full Title Deed'][0].mimetype,
        );
        fileUrls['Full Title Deed'] = uploadedFile;
      }

      if (files["Evaluator's Report"]?.[0]) {
        const uploadedFile = await this.googleDriveService.uploadFile(
          files["Evaluator's Report"][0].buffer,
          files["Evaluator's Report"][0].originalname,
          files["Evaluator's Report"][0].mimetype,
        );
        fileUrls["Evaluator's Report"] = uploadedFile;
      }

      // Create record in database
      const dbData = {
        sheetId: id,
        creditApplicationId: createDto['Credit Application ID'],
        type: createDto.Type || '',
        toBeUsedAsSecurity: createDto['To Be Used As Security?'] || '',
        description: createDto.Description || '',
        legalOwner: createDto['Legal Owner'] || '',
        userId: createDto['User ID'] || '',
        fullOwnerDetails: createDto['Full Owner Details'] || '',
        collateralOwnedByDirectorOfSchool:
          createDto['Collateral owned by director of school?'] || '',
        plotNumber: createDto['Plot Number'] || '',
        schoolSitsOnLand: createDto['School sits on land?'] || '',
        hasComprehensiveInsurance:
          createDto['Has Comprehensive Insurance'] || '',
        originalInsuranceCoverage:
          createDto['Original Insurance Coverage']?.toString() || '',
        initialEstimatedValue:
          createDto['Initial Estimated Value (KES)']?.toString() || '',
        approvedByLegalTeamOrNTSAAgent:
          createDto[
            'Approved by Legal Team or NTSA Agent for use as Security?'
          ] || '',
        notesOnApprovalForUse: createDto['Notes on Approval for Use'] || '',
        evaluatorsMarketValue:
          createDto["Evaluator's Market Value"]?.toString() || '',
        evaluatorsForcedValue:
          createDto["Evaluator's Forced Value"]?.toString() || '',
        moneyOwedOnAsset:
          createDto['Money Owed on Asset (If Any)']?.toString() || '',
        licensePlateNumber: createDto['License Plate Number'] || '',
        engineCC: createDto['Engine CC']?.toString() || '',
        yearOfManufacture: createDto['Year of Manufacture']?.toString() || '',
        logbookPhoto: fileUrls['Logbook Photo'],
        titleDeedPhoto: fileUrls['Title Deed Photo'],
        fullTitleDeed: fileUrls['Full Title Deed'],
        evaluatorsReport: fileUrls["Evaluator's Report"],
      };

      const createdRecord = await this.assetTitleDbService.create(dbData);
      this.logger.log(
        `Created record in database with ID: ${createdRecord.id}`,
      );

      // Trigger background sync
      await this.triggerBackgroundSync(
        createdRecord.id,
        createDto['Credit Application ID'],
        'create',
      );

      return {
        success: true,
        message: 'Asset title record created successfully',
        data: {
          id: createdRecord.id,
          sheetId: createdRecord.sheetId,
          ...dbData,
        },
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating asset title record: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getAssetTitlesByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Fetching asset titles for credit application: ${creditApplicationId}`,
      );

      const records =
        await this.assetTitleDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (!records || records.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Convert database records to original sheet format for frontend compatibility
      const recordsWithOriginalKeys = records.map((record) => {
        const convertedRecord =
          this.assetTitleDbService.convertDbDataToSheet(record);

        // Add additional fields that might not be in the mapping
        convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
        convertedRecord['Synced'] = record.synced || false;

        return convertedRecord;
      });

      return {
        success: true,
        count: recordsWithOriginalKeys.length,
        data: recordsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching asset titles for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getAssetTitleById(@Param('id') id: string) {
    try {
      const record = await this.assetTitleDbService.findById(id);
      if (!record) {
        return { success: false, message: 'Asset title not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const convertedRecord =
        this.assetTitleDbService.convertDbDataToSheet(record);

      // Add additional fields that might not be in the mapping
      convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
      convertedRecord['Synced'] = record.synced || false;

      return { success: true, data: convertedRecord };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching asset title ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllAssetTitles() {
    try {
      const records = await this.assetTitleDbService.findAll();

      if (!records || records.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Convert database records to original sheet format for frontend compatibility
      const recordsWithOriginalKeys = records.map((record) => {
        const convertedRecord =
          this.assetTitleDbService.convertDbDataToSheet(record);

        // Add additional fields that might not be in the mapping
        convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
        convertedRecord['Synced'] = record.synced || false;

        return convertedRecord;
      });

      return {
        success: true,
        count: recordsWithOriginalKeys.length,
        data: recordsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all asset titles: ${apiError.message}`);
      throw error;
    }
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'Logbook Photo', maxCount: 1 },
      { name: 'Title Deed Photo', maxCount: 1 },
      { name: 'Full Title Deed', maxCount: 1 },
      { name: "Evaluator's Report", maxCount: 1 },
    ]),
  )
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields for file uploads
      transform: true,
    }),
  )
  async updateAssetTitle(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateAssetTitleDto>,
    @UploadedFiles()
    files: {
      'Logbook Photo'?: Express.Multer.File[];
      'Title Deed Photo'?: Express.Multer.File[];
      'Full Title Deed'?: Express.Multer.File[];
      "Evaluator's Report"?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating asset title with ID: ${id}`);

      // Find existing record by sheetId
      const existingRecord = await this.assetTitleDbService.findBySheetId(id);
      if (!existingRecord) {
        return { success: false, message: 'Asset title not found' };
      }

      // Upload new files if provided
      const fileUrls: any = {};
      if (files['Logbook Photo']?.[0]) {
        const uploadedFile = await this.googleDriveService.uploadFile(
          files['Logbook Photo'][0].buffer,
          files['Logbook Photo'][0].originalname,
          files['Logbook Photo'][0].mimetype,
        );
        fileUrls.logbookPhoto = uploadedFile;
      }

      if (files['Title Deed Photo']?.[0]) {
        const uploadedFile = await this.googleDriveService.uploadFile(
          files['Title Deed Photo'][0].buffer,
          files['Title Deed Photo'][0].originalname,
          files['Title Deed Photo'][0].mimetype,
        );
        fileUrls.titleDeedPhoto = uploadedFile;
      }

      if (files['Full Title Deed']?.[0]) {
        const uploadedFile = await this.googleDriveService.uploadFile(
          files['Full Title Deed'][0].buffer,
          files['Full Title Deed'][0].originalname,
          files['Full Title Deed'][0].mimetype,
        );
        fileUrls.fullTitleDeed = uploadedFile;
      }

      if (files["Evaluator's Report"]?.[0]) {
        const uploadedFile = await this.googleDriveService.uploadFile(
          files["Evaluator's Report"][0].buffer,
          files["Evaluator's Report"][0].originalname,
          files["Evaluator's Report"][0].mimetype,
        );
        fileUrls.evaluatorsReport = uploadedFile;
      }

      // Prepare update data with only provided fields
      const updateData: any = {};
      if (updateDto['Credit Application ID'] !== undefined) {
        updateData.creditApplicationId = updateDto['Credit Application ID'];
      }
      if (updateDto.Type !== undefined) {
        updateData.type = updateDto.Type;
      }
      if (updateDto['To Be Used As Security?'] !== undefined) {
        updateData.toBeUsedAsSecurity = updateDto['To Be Used As Security?'];
      }
      if (updateDto.Description !== undefined) {
        updateData.description = updateDto.Description;
      }
      if (updateDto['Legal Owner'] !== undefined) {
        updateData.legalOwner = updateDto['Legal Owner'];
      }
      if (updateDto['User ID'] !== undefined) {
        updateData.userId = updateDto['User ID'];
      }
      if (updateDto['Full Owner Details'] !== undefined) {
        updateData.fullOwnerDetails = updateDto['Full Owner Details'];
      }
      if (updateDto['Collateral owned by director of school?'] !== undefined) {
        updateData.collateralOwnedByDirectorOfSchool =
          updateDto['Collateral owned by director of school?'];
      }
      if (updateDto['Plot Number'] !== undefined) {
        updateData.plotNumber = updateDto['Plot Number'];
      }
      if (updateDto['School sits on land?'] !== undefined) {
        updateData.schoolSitsOnLand = updateDto['School sits on land?'];
      }
      if (updateDto['Has Comprehensive Insurance'] !== undefined) {
        updateData.hasComprehensiveInsurance =
          updateDto['Has Comprehensive Insurance'];
      }
      if (updateDto['Original Insurance Coverage'] !== undefined) {
        updateData.originalInsuranceCoverage =
          updateDto['Original Insurance Coverage']?.toString();
      }
      if (updateDto['Initial Estimated Value (KES)'] !== undefined) {
        updateData.initialEstimatedValue =
          updateDto['Initial Estimated Value (KES)']?.toString();
      }
      if (
        updateDto[
          'Approved by Legal Team or NTSA Agent for use as Security?'
        ] !== undefined
      ) {
        updateData.approvedByLegalTeamOrNTSAAgent =
          updateDto[
            'Approved by Legal Team or NTSA Agent for use as Security?'
          ];
      }
      if (updateDto['Notes on Approval for Use'] !== undefined) {
        updateData.notesOnApprovalForUse =
          updateDto['Notes on Approval for Use'];
      }
      if (updateDto["Evaluator's Market Value"] !== undefined) {
        updateData.evaluatorsMarketValue =
          updateDto["Evaluator's Market Value"]?.toString();
      }
      if (updateDto["Evaluator's Forced Value"] !== undefined) {
        updateData.evaluatorsForcedValue =
          updateDto["Evaluator's Forced Value"]?.toString();
      }
      if (updateDto['Money Owed on Asset (If Any)'] !== undefined) {
        updateData.moneyOwedOnAsset =
          updateDto['Money Owed on Asset (If Any)']?.toString();
      }
      if (updateDto['License Plate Number'] !== undefined) {
        updateData.licensePlateNumber = updateDto['License Plate Number'];
      }
      if (updateDto['Engine CC'] !== undefined) {
        updateData.engineCC = updateDto['Engine CC']?.toString();
      }
      if (updateDto['Year of Manufacture'] !== undefined) {
        updateData.yearOfManufacture =
          updateDto['Year of Manufacture']?.toString();
      }

      // Add file URLs to update data
      Object.assign(updateData, fileUrls);

      // Update record in database
      const updatedRecord = await this.assetTitleDbService.updateById(
        existingRecord.id,
        updateData,
      );
      this.logger.log(
        `Updated record in database with ID: ${updatedRecord.id}`,
      );

      // Trigger background sync
      await this.triggerBackgroundSync(
        updatedRecord.id,
        updatedRecord.creditApplicationId,
        'update',
      );

      // Convert to sheet format for response
      const convertedRecord =
        this.assetTitleDbService.convertDbDataToSheet(updatedRecord);
      convertedRecord['Created At'] =
        updatedRecord.createdAt?.toISOString() || '';
      convertedRecord['Synced'] = updatedRecord.synced || false;

      return {
        success: true,
        message: 'Asset title updated successfully',
        data: convertedRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating asset title: ${apiError.message}`);
      throw error;
    }
  }

  @Delete(':id')
  async deleteAssetTitle(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting asset title with ID: ${id}`);

      // Find existing record by sheetId
      const existingRecord = await this.assetTitleDbService.findBySheetId(id);
      if (!existingRecord) {
        return { success: false, message: 'Asset title not found' };
      }

      // Delete from Google Sheets if sheetId is not temporary
      if (existingRecord.sheetId && !existingRecord.sheetId.startsWith('AT-')) {
        try {
          await this.sheetsService.deleteRow(this.SHEET_NAME, id);
          this.logger.log(`Deleted from Google Sheets: ${id}`);
        } catch (sheetsError: any) {
          this.logger.error(
            `Error deleting from Google Sheets: ${sheetsError.message}`,
          );
        }
      }

      // Delete from database
      await this.assetTitleDbService.delete(existingRecord.id.toString());

      return {
        success: true,
        message: 'Asset title deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error deleting asset title: ${apiError.message}`);
      throw error;
    }
  }

  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for asset title ${dbId} (${operation})`,
      );

      // Trigger sync in the background
      setTimeout(async () => {
        try {
          await this.assetTitleSyncService.syncAssetTitleById(dbId, operation);
          this.logger.log(`Background sync completed for asset title ${dbId}`);
        } catch (error) {
          this.logger.error(
            `Background sync failed for asset title ${dbId}:`,
            error,
          );
        }
      }, 1000);
    } catch (error) {
      this.logger.error(
        `Error triggering background sync for asset title ${dbId}:`,
        error,
      );
    }
  }

  @Post('sync/:id')
  async syncAssetTitleById(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync triggered for asset title: ${id}`);
      const result = await this.assetTitleSyncService.syncAssetTitleById(
        parseInt(id),
      );
      return {
        success: true,
        message: `Successfully synced asset title ${id}`,
        data: result,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error syncing asset title ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Post('sync-all')
  async syncAllAssetTitles() {
    try {
      this.logger.log('Manual sync all asset titles triggered');
      const result = await this.assetTitleSyncService.syncAllToSheets();
      return {
        success: true,
        message: 'Successfully synced all asset titles',
        data: result,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error syncing all asset titles: ${apiError.message}`);
      throw error;
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncAssetTitlesByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync triggered for asset titles by application: ${creditApplicationId}`,
      );
      const result =
        await this.assetTitleSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return {
        success: true,
        message: `Successfully synced asset titles for application ${creditApplicationId}`,
        data: result,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error syncing asset titles for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }
}
