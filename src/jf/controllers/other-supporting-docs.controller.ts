import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  UseInterceptors,
  UploadedFiles,
  Body,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateOtherSupportingDocDto } from '../dto/create-other-supporting-doc.dto';
import { OtherSupportingDocsDbService } from '../services/other-supporting-docs-db.service';
import { OtherSupportingDocsSyncService } from '../services/other-supporting-docs-sync.service';
import { FileUploadService } from '../services/file-upload.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/supporting-docs')
export class OtherSupportingDocsController {
  private readonly logger = new Logger(OtherSupportingDocsController.name);
  private readonly GOOGLE_DRIVE_OTHER_SUPPORTING_DOCS_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_OTHER_SUPPORTING_DOCS_FILES_FOLDER_ID;
  private readonly OTHER_SUPPORTING_DOCS_FILES_FOLDER_NAME =
    process.env.GOOGLE_DRIVE_OTHER_SUPPORTING_DOCS_FILES_FOLDER_NAME;

  constructor(
    private readonly otherSupportingDocsDbService: OtherSupportingDocsDbService,
    private readonly otherSupportingDocsSyncService: OtherSupportingDocsSyncService,
    private readonly fileUploadService: FileUploadService,
    private readonly backgroundUploadService: BackgroundUploadService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ]),
  )
  async createSupportingDoc(
    @Body() createDto: CreateOtherSupportingDocDto,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(
        `Creating new supporting document for application: ${createDto.creditApplicationId}`,
      );

      if (!createDto.creditApplicationId) {
        return {
          success: false,
          error: 'Credit Application ID is required',
        };
      }

      // Save files locally first for faster response
      let filePath = '';
      let imagePath = '';
      const now = new Date().toISOString();

      if (files.file && files.file[0]) {
        const customName = `supporting_doc_${createDto.creditApplicationId}`;
        filePath = await this.fileUploadService.saveFile(
          files.file[0],
          'other-supporting-docs',
          customName,
        );
      }

      if (files.image && files.image[0]) {
        const customName = `supporting_image_${createDto.creditApplicationId}`;
        imagePath = await this.fileUploadService.saveFile(
          files.image[0],
          'other-supporting-docs',
          customName,
        );
      }

      // Prepare supporting document data for Postgres
      const supportingDocDataForDb = {
        sheetId: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Generate temporary sheetId
        creditApplicationId: createDto.creditApplicationId,
        documentType: createDto.documentType,
        notes: createDto.notes || '',
        file: filePath || '',
        image: imagePath || '',
        synced: false,
        createdAt: now,
      };

      const result = await this.otherSupportingDocsDbService.create(
        supportingDocDataForDb,
      );
      this.logger.log(`Supporting document added successfully via Postgres`);

      // Queue file uploads to Google Drive with supporting document ID for database updates
      if (files.file && files.file[0]) {
        const customName = `supporting_doc_${createDto.creditApplicationId}`;
        this.logger.log(
          `Queueing file upload for supporting document ${result.id} with path: ${filePath}`,
        );
        this.backgroundUploadService.queueFileUpload(
          filePath,
          `${customName}_${Date.now()}.${files.file[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_OTHER_SUPPORTING_DOCS_FILES_FOLDER_ID,
          files.file[0].mimetype,
          undefined, // directorId
          undefined, // fieldName
          undefined, // consentId
          undefined, // consentFieldName
          undefined, // referrerId
          undefined, // referrerFieldName
          undefined, // creditApplicationId
          undefined, // creditApplicationFieldName
          undefined, // activeDebtId
          undefined, // activeDebtFieldName
          undefined, // feePlanId
          undefined, // feePlanFieldName
          undefined, // enrollmentVerificationId
          undefined, // enrollmentVerificationFieldName
          undefined, // mpesaBankStatementId
          undefined, // mpesaBankStatementFieldName
          undefined, // auditedFinancialId
          undefined, // auditedFinancialFieldName
          Number(result.id), // otherSupportingDocId
          'file', // otherSupportingDocFieldName
          undefined, // vendorDisbursementDetailId
          undefined, // vendorDisbursementDetailFieldName
          'create', // operation
        );
        this.logger.log(
          `File upload queued successfully for supporting document ${result.id}`,
        );
      }

      if (files.image && files.image[0]) {
        const customName = `supporting_image_${createDto.creditApplicationId}`;
        this.logger.log(
          `Queueing image upload for supporting document ${result.id} with path: ${imagePath}`,
        );
        this.backgroundUploadService.queueFileUpload(
          imagePath,
          `${customName}_${Date.now()}.${files.image[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_OTHER_SUPPORTING_DOCS_FILES_FOLDER_ID,
          files.image[0].mimetype,
          undefined, // directorId
          undefined, // fieldName
          undefined, // consentId
          undefined, // consentFieldName
          undefined, // referrerId
          undefined, // referrerFieldName
          undefined, // creditApplicationId
          undefined, // creditApplicationFieldName
          undefined, // activeDebtId
          undefined, // activeDebtFieldName
          undefined, // feePlanId
          undefined, // feePlanFieldName
          undefined, // enrollmentVerificationId
          undefined, // enrollmentVerificationFieldName
          undefined, // mpesaBankStatementId
          undefined, // mpesaBankStatementFieldName
          undefined, // auditedFinancialId
          undefined, // auditedFinancialFieldName
          Number(result.id), // otherSupportingDocId
          'image', // otherSupportingDocFieldName
          undefined, // vendorDisbursementDetailId
          undefined, // vendorDisbursementDetailFieldName
          'create', // operation
        );
        this.logger.log(
          `Image upload queued successfully for supporting document ${result.id}`,
        );
      }

      // Trigger automatic sync to Google Sheets only if no files were uploaded
      // If files were uploaded, the background upload service will handle the sync
      if (!files.file && !files.image) {
        this.triggerBackgroundSync(
          result.id,
          result.creditApplicationId,
          'create',
        );
      }

      return {
        success: true,
        data: result,
        message: 'Supporting document added successfully',
        sync: {
          triggered: true,
          status: files.file || files.image ? 'background' : 'immediate',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `========Failed to add supporting document: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync for supporting document
   */
  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for supporting document ${dbId} (${operation})`,
      );
      await this.otherSupportingDocsSyncService.syncOtherSupportingDocById(
        dbId,
        operation,
      );
      this.logger.log(
        `Background sync triggered successfully for supporting document ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger background sync for supporting document ${dbId}: ${error}`,
      );
    }
  }

  @Get('by-application/:creditApplicationId')
  async getDocsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching supporting documents for application ID: ${creditApplicationId}`,
      );

      const supportingDocs =
        await this.otherSupportingDocsDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      // Convert database records to original sheet format for frontend compatibility
      const supportingDocsWithOriginalKeys = supportingDocs.map((doc) => {
        const convertedDoc = {
          ID: doc.sheetId || '',
          'Credit Application ID': doc.creditApplicationId || '',
          'Document Type': doc.documentType || '',
          Notes: doc.notes || '',
          File: doc.file || '',
          Image: doc.image || '',
          'Created At': doc.createdAt?.toISOString() || '',
          Synced: doc.synced || false,
        };
        return convertedDoc;
      });

      // Add Google Drive links for document columns
      const documentColumns = ['File', 'Image'];
      const supportingDocsWithLinks = await Promise.all(
        supportingDocsWithOriginalKeys.map(async (doc) => {
          const docWithLinks = { ...doc };
          for (const column of documentColumns) {
            if (doc[column]) {
              const filename = doc[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.GOOGLE_DRIVE_OTHER_SUPPORTING_DOCS_FILES_FOLDER_ID,
              );
              docWithLinks[column] = fileLink;
            }
          }
          return docWithLinks;
        }),
      );

      this.logger.debug(
        `Found ${supportingDocsWithLinks.length} matching supporting documents`,
      );

      return {
        success: true,
        count: supportingDocsWithLinks.length,
        data: supportingDocsWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching supporting documents for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getDocById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching supporting document with ID: ${id}`);
      const supportingDoc =
        await this.otherSupportingDocsDbService.findById(id);

      if (!supportingDoc) {
        return { success: false, message: 'Supporting document not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const supportingDocWithOriginalKeys = {
        ID: supportingDoc.sheetId || '',
        'Credit Application ID': supportingDoc.creditApplicationId || '',
        'Document Type': supportingDoc.documentType || '',
        Notes: supportingDoc.notes || '',
        File: supportingDoc.file || '',
        Image: supportingDoc.image || '',
        'Created At': supportingDoc.createdAt?.toISOString() || '',
        Synced: supportingDoc.synced || false,
      };

      // Add Google Drive links for document columns
      const documentColumns = ['File', 'Image'];
      const supportingDocWithLinks = { ...supportingDocWithOriginalKeys };
      for (const column of documentColumns) {
        if (supportingDocWithLinks[column]) {
          const filename = supportingDocWithLinks[column].split('/').pop();
          const fileLink = await this.googleDriveService.getFileLink(
            filename,
            this.GOOGLE_DRIVE_OTHER_SUPPORTING_DOCS_FILES_FOLDER_ID,
          );
          supportingDocWithLinks[column] = fileLink;
        }
      }

      return { success: true, data: supportingDocWithLinks };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching supporting document ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllDocs() {
    try {
      this.logger.debug('Fetching all supporting documents');

      const supportingDocs = await this.otherSupportingDocsDbService.findAll();

      // Convert database records to original sheet format for frontend compatibility
      const supportingDocsWithOriginalKeys = supportingDocs.map((doc) => {
        const convertedDoc = {
          ID: doc.sheetId || '',
          'Credit Application ID': doc.creditApplicationId || '',
          'Document Type': doc.documentType || '',
          Notes: doc.notes || '',
          File: doc.file || '',
          Image: doc.image || '',
          'Created At': doc.createdAt?.toISOString() || '',
          Synced: doc.synced || false,
        };
        return convertedDoc;
      });

      // Add Google Drive links for document columns
      const documentColumns = ['File', 'Image'];
      const supportingDocsWithLinks = await Promise.all(
        supportingDocsWithOriginalKeys.map(async (doc) => {
          const docWithLinks = { ...doc };
          for (const column of documentColumns) {
            if (doc[column]) {
              const filename = doc[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.GOOGLE_DRIVE_OTHER_SUPPORTING_DOCS_FILES_FOLDER_ID,
              );
              docWithLinks[column] = fileLink;
            }
          }
          return docWithLinks;
        }),
      );

      return {
        success: true,
        count: supportingDocsWithLinks.length,
        data: supportingDocsWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all supporting documents: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ]),
  )
  async updateSupportingDoc(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateOtherSupportingDocDto>,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating supporting document with ID: ${id}`);

      // Find the existing supporting document by sheetId (since the id parameter is the sheetId)
      const existingSupportingDoc =
        await this.otherSupportingDocsDbService.findBySheetId(id);
      if (!existingSupportingDoc) {
        return { success: false, error: 'Supporting document not found' };
      }

      this.logger.log(
        `Updating supporting document with sheetId: ${id}, database ID: ${existingSupportingDoc.id}`,
      );

      // Handle file uploads if provided
      let filePath = existingSupportingDoc.file || '';
      let imagePath = existingSupportingDoc.image || '';

      if (files.file && files.file[0]) {
        const customName = `supporting_doc_${updateDto.creditApplicationId || existingSupportingDoc.creditApplicationId}`;
        this.logger.log(
          `Updating supporting document ${existingSupportingDoc.id} with new file upload`,
        );
        filePath = await this.fileUploadService.saveFile(
          files.file[0],
          'other-supporting-docs',
          customName,
        );

        // Queue file upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          filePath,
          `${customName}_${Date.now()}.${files.file[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_OTHER_SUPPORTING_DOCS_FILES_FOLDER_ID,
          files.file[0].mimetype,
          undefined, // directorId
          undefined, // fieldName
          undefined, // consentId
          undefined, // consentFieldName
          undefined, // referrerId
          undefined, // referrerFieldName
          undefined, // creditApplicationId
          undefined, // creditApplicationFieldName
          undefined, // activeDebtId
          undefined, // activeDebtFieldName
          undefined, // feePlanId
          undefined, // feePlanFieldName
          undefined, // enrollmentVerificationId
          undefined, // enrollmentVerificationFieldName
          undefined, // mpesaBankStatementId
          undefined, // mpesaBankStatementFieldName
          undefined, // auditedFinancialId
          undefined, // auditedFinancialFieldName
          Number(existingSupportingDoc.id), // otherSupportingDocId
          'file', // otherSupportingDocFieldName
          undefined, // vendorDisbursementDetailId
          undefined, // vendorDisbursementDetailFieldName
          'update', // operation
        );
        this.logger.log(
          `File upload queued for supporting document update ${existingSupportingDoc.id}`,
        );
      }

      if (files.image && files.image[0]) {
        const customName = `supporting_image_${updateDto.creditApplicationId || existingSupportingDoc.creditApplicationId}`;
        this.logger.log(
          `Updating supporting document ${existingSupportingDoc.id} with new image upload`,
        );
        imagePath = await this.fileUploadService.saveFile(
          files.image[0],
          'other-supporting-docs',
          customName,
        );

        // Queue image upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          imagePath,
          `${customName}_${Date.now()}.${files.image[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_OTHER_SUPPORTING_DOCS_FILES_FOLDER_ID,
          files.image[0].mimetype,
          undefined, // directorId
          undefined, // fieldName
          undefined, // consentId
          undefined, // consentFieldName
          undefined, // referrerId
          undefined, // referrerFieldName
          undefined, // creditApplicationId
          undefined, // creditApplicationFieldName
          undefined, // activeDebtId
          undefined, // activeDebtFieldName
          undefined, // feePlanId
          undefined, // feePlanFieldName
          undefined, // enrollmentVerificationId
          undefined, // enrollmentVerificationFieldName
          undefined, // mpesaBankStatementId
          undefined, // mpesaBankStatementFieldName
          undefined, // auditedFinancialId
          undefined, // auditedFinancialFieldName
          Number(existingSupportingDoc.id), // otherSupportingDocId
          'image', // otherSupportingDocFieldName
          undefined, // vendorDisbursementDetailId
          undefined, // vendorDisbursementDetailFieldName
          'update', // operation
        );
        this.logger.log(
          `Image upload queued for supporting document update ${existingSupportingDoc.id}`,
        );
      }

      // Prepare update data
      const updateDataForDb = {
        creditApplicationId:
          updateDto.creditApplicationId ||
          existingSupportingDoc.creditApplicationId,
        documentType:
          updateDto.documentType || existingSupportingDoc.documentType,
        notes: updateDto.notes || existingSupportingDoc.notes,
        file: filePath,
        image: imagePath,
        synced: false, // Mark as unsynced to trigger sync
      };

      const result = await this.otherSupportingDocsDbService.updateById(
        existingSupportingDoc.id,
        updateDataForDb,
      );
      this.logger.log(`Supporting document updated successfully via Postgres`);

      // Trigger background sync only if no files were uploaded
      // If files were uploaded, the background upload service will handle the sync
      if (!files.file && !files.image) {
        this.triggerBackgroundSync(
          result.id,
          result.creditApplicationId,
          'update',
        );
      }

      return {
        success: true,
        data: result,
        message: 'Supporting document updated successfully',
        sync: {
          triggered: true,
          status: files.file || files.image ? 'background' : 'immediate',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to update supporting document: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Delete(':id')
  async deleteSupportingDoc(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting supporting document with ID: ${id}`);

      // Find the existing supporting document by sheetId
      const existingSupportingDoc =
        await this.otherSupportingDocsDbService.findBySheetId(id);
      if (!existingSupportingDoc) {
        return { success: false, error: 'Supporting document not found' };
      }

      // Delete from database
      await this.otherSupportingDocsDbService.delete(
        existingSupportingDoc.id.toString(),
      );

      return {
        success: true,
        message: 'Supporting document deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to delete supporting document: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  // Sync endpoints
  @Post('sync/:id')
  async syncSupportingDocById(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync requested for supporting document: ${id}`);
      const result =
        await this.otherSupportingDocsSyncService.syncOtherSupportingDocById(
          parseInt(id),
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync supporting document ${id}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllSupportingDocs() {
    try {
      this.logger.log('Manual sync requested for all supporting documents');
      const result =
        await this.otherSupportingDocsSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync all supporting documents: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncSupportingDocsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync requested for supporting documents by credit application: ${creditApplicationId}`,
      );
      const result =
        await this.otherSupportingDocsSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync supporting documents for credit application ${creditApplicationId}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
