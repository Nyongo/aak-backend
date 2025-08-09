import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  Logger,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateAuditedFinancialDto } from '../dto/create-audited-financial.dto';
import { AuditedFinancialsDbService } from '../services/audited-financials-db.service';
import { AuditedFinancialsSyncService } from '../services/audited-financials-sync.service';
import { FileUploadService } from '../services/file-upload.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/audited-financials')
export class AuditedFinancialsController {
  private readonly logger = new Logger(AuditedFinancialsController.name);
  private readonly GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID;
  private readonly GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_NAME =
    process.env.GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_NAME;
  constructor(
    private readonly auditedFinancialsDbService: AuditedFinancialsDbService,
    private readonly auditedFinancialsSyncService: AuditedFinancialsSyncService,
    private readonly fileUploadService: FileUploadService,
    private readonly backgroundUploadService: BackgroundUploadService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('file'))
  async createFinancialStatement(
    @Body() createDto: CreateAuditedFinancialDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      this.logger.log(
        `Creating new audited financial for application: ${createDto.creditApplicationId}`,
      );

      if (!createDto.creditApplicationId) {
        return {
          success: false,
          error: 'Credit Application ID is required',
        };
      }

      // Save file locally first for faster response
      let filePath = '';
      const now = new Date().toISOString();

      if (file) {
        const customName = `audited_financial_${createDto.creditApplicationId}`;
        filePath = await this.fileUploadService.saveFile(
          file,
          'audited-financials',
          customName,
        );
      }

      // Prepare audited financial data for Postgres
      const auditedFinancialDataForDb = {
        sheetId: `FIN-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Generate temporary sheetId
        creditApplicationId: createDto.creditApplicationId,
        statementType: createDto.statementType,
        notes: createDto.notes || '',
        file: filePath || '',
        synced: false,
        createdAt: now,
      };

      const result = await this.auditedFinancialsDbService.create(
        auditedFinancialDataForDb,
      );
      this.logger.log(`Audited financial added successfully via Postgres`);

      // Queue file upload to Google Drive with audited financial ID for database updates
      if (file) {
        const customName = `audited_financial_${createDto.creditApplicationId}`;
        this.logger.log(
          `Queueing file upload for audited financial ${result.id} with path: ${filePath}`,
        );
        this.backgroundUploadService.queueFileUpload(
          filePath,
          `${customName}_${Date.now()}.${file.originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID,
          file.mimetype,
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
          undefined, // enrollmentVerificationId (not applicable)
          undefined, // enrollmentVerificationFieldName (not applicable)
          undefined, // mpesaBankStatementId (not applicable)
          undefined, // mpesaBankStatementFieldName (not applicable)
          result.id, // Pass audited financial ID
          'file', // Pass field name
        );
        this.logger.log(
          `File upload queued successfully for audited financial ${result.id}`,
        );
      }

      // Only trigger immediate sync if no files were uploaded
      // If files were uploaded, the background upload service will handle the sync
      if (!file) {
        this.triggerBackgroundSync(
          result.id,
          result.creditApplicationId,
          'create',
        );
      }

      return {
        success: true,
        data: result,
        message: 'Audited financial added successfully',
        sync: {
          triggered: true,
          status: file ? 'background' : 'immediate',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `========Failed to add audited financial: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync for audited financial
   */
  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for audited financial ${dbId} (${operation})`,
      );
      await this.auditedFinancialsSyncService.syncAuditedFinancialById(
        dbId,
        operation,
      );
      this.logger.log(
        `Background sync triggered successfully for audited financial ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger background sync for audited financial ${dbId}: ${error}`,
      );
    }
  }

  @Get('by-application/:creditApplicationId')
  async getFinancialsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching audited financials for application ID: ${creditApplicationId}`,
      );

      const auditedFinancials =
        await this.auditedFinancialsDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      // Convert database records to original sheet format for frontend compatibility
      const auditedFinancialsWithOriginalKeys = auditedFinancials.map(
        (financial) => {
          const convertedFinancial = {
            ID: financial.sheetId || '',
            'Credit Application ID': financial.creditApplicationId || '',
            'Statement Type': financial.statementType || '',
            Notes: financial.notes || '',
            File: financial.file || '',
            'Created At': financial.createdAt?.toISOString() || '',
            Synced: financial.synced || false,
          };
          return convertedFinancial;
        },
      );

      // Add Google Drive links for document columns
      const documentColumns = ['File'];
      const auditedFinancialsWithLinks = await Promise.all(
        auditedFinancialsWithOriginalKeys.map(async (financial) => {
          const financialWithLinks = { ...financial };
          for (const column of documentColumns) {
            if (financial[column]) {
              const filename = financial[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID,
              );
              financialWithLinks[column] = fileLink;
            }
          }
          return financialWithLinks;
        }),
      );

      this.logger.debug(
        `Found ${auditedFinancialsWithLinks.length} matching audited financials`,
      );

      return {
        success: true,
        count: auditedFinancialsWithLinks.length,
        data: auditedFinancialsWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching audited financials for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getFinancialById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching audited financial with ID: ${id}`);
      const auditedFinancial =
        await this.auditedFinancialsDbService.findById(id);

      if (!auditedFinancial) {
        return { success: false, message: 'Audited financial not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const auditedFinancialWithOriginalKeys = {
        ID: auditedFinancial.sheetId || '',
        'Credit Application ID': auditedFinancial.creditApplicationId || '',
        'Statement Type': auditedFinancial.statementType || '',
        Notes: auditedFinancial.notes || '',
        File: auditedFinancial.file || '',
        'Created At': auditedFinancial.createdAt?.toISOString() || '',
        Synced: auditedFinancial.synced || false,
      };

      // Add Google Drive links for document columns
      const documentColumns = ['File'];
      const auditedFinancialWithLinks = { ...auditedFinancialWithOriginalKeys };
      for (const column of documentColumns) {
        if (auditedFinancialWithLinks[column]) {
          const filename = auditedFinancialWithLinks[column].split('/').pop();
          const fileLink = await this.googleDriveService.getFileLink(
            filename,
            this.GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID,
          );
          auditedFinancialWithLinks[column] = fileLink;
        }
      }

      return { success: true, data: auditedFinancialWithLinks };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching audited financial ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllFinancials() {
    try {
      this.logger.debug('Fetching all audited financials');

      const auditedFinancials = await this.auditedFinancialsDbService.findAll();

      // Convert database records to original sheet format for frontend compatibility
      const auditedFinancialsWithOriginalKeys = auditedFinancials.map(
        (financial) => {
          const convertedFinancial = {
            ID: financial.sheetId || '',
            'Credit Application ID': financial.creditApplicationId || '',
            'Statement Type': financial.statementType || '',
            Notes: financial.notes || '',
            File: financial.file || '',
            'Created At': financial.createdAt?.toISOString() || '',
            Synced: financial.synced || false,
          };
          return convertedFinancial;
        },
      );

      // Add Google Drive links for document columns
      const documentColumns = ['File'];
      const auditedFinancialsWithLinks = await Promise.all(
        auditedFinancialsWithOriginalKeys.map(async (financial) => {
          const financialWithLinks = { ...financial };
          for (const column of documentColumns) {
            if (financial[column]) {
              const filename = financial[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID,
              );
              financialWithLinks[column] = fileLink;
            }
          }
          return financialWithLinks;
        }),
      );

      return {
        success: true,
        count: auditedFinancialsWithLinks.length,
        data: auditedFinancialsWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all audited financials: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('file'))
  async updateFinancialStatement(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateAuditedFinancialDto>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating audited financial with ID: ${id}`);

      // Find the existing audited financial by sheetId (since the id parameter is the sheetId)
      const existingAuditedFinancial =
        await this.auditedFinancialsDbService.findBySheetId(id);
      if (!existingAuditedFinancial) {
        return { success: false, error: 'Audited financial not found' };
      }

      this.logger.log(
        `Updating audited financial with sheetId: ${id}, database ID: ${existingAuditedFinancial.id}, current file: ${existingAuditedFinancial.file}`,
      );

      // Handle file upload if provided
      let filePath = existingAuditedFinancial.file || '';

      if (file) {
        const customName = `audited_financial_${updateDto.creditApplicationId || existingAuditedFinancial.creditApplicationId}`;
        this.logger.log(
          `Updating audited financial ${existingAuditedFinancial.id} with new file upload`,
        );
        filePath = await this.fileUploadService.saveFile(
          file,
          'audited-financials',
          customName,
        );

        // Queue file upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          filePath,
          `${customName}_${Date.now()}.${file.originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID,
          file.mimetype,
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
          undefined, // enrollmentVerificationId (not applicable)
          undefined, // enrollmentVerificationFieldName (not applicable)
          undefined, // mpesaBankStatementId (not applicable)
          undefined, // mpesaBankStatementFieldName (not applicable)
          existingAuditedFinancial.id, // Pass audited financial ID
          'file', // Pass field name
        );
        this.logger.log(
          `File upload queued for audited financial update ${existingAuditedFinancial.id}`,
        );
      }

      // Prepare update data
      const updateDataForDb = {
        creditApplicationId:
          updateDto.creditApplicationId ||
          existingAuditedFinancial.creditApplicationId,
        statementType:
          updateDto.statementType || existingAuditedFinancial.statementType,
        notes: updateDto.notes || existingAuditedFinancial.notes,
        file: filePath,
        synced: false, // Mark as unsynced to trigger sync
      };

      const result = await this.auditedFinancialsDbService.update(
        id,
        updateDataForDb,
      );
      this.logger.log(`Audited financial updated successfully via Postgres`);

      // Only trigger immediate sync if no files were uploaded
      // If files were uploaded, the background upload service will handle the sync
      if (!file) {
        this.triggerBackgroundSync(
          result.id,
          result.creditApplicationId,
          'update',
        );
      }

      return {
        success: true,
        data: result,
        message: 'Audited financial updated successfully',
        sync: {
          triggered: true,
          status: file ? 'background' : 'immediate',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to update audited financial: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  // Sync endpoints
  @Post('sync/:id')
  async syncAuditedFinancialById(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync requested for audited financial: ${id}`);
      const result =
        await this.auditedFinancialsSyncService.syncAuditedFinancialById(
          parseInt(id),
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync audited financial ${id}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllAuditedFinancials() {
    try {
      this.logger.log('Manual sync requested for all audited financials');
      const result = await this.auditedFinancialsSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync all audited financials: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncAuditedFinancialsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync requested for audited financials by credit application: ${creditApplicationId}`,
      );
      const result =
        await this.auditedFinancialsSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync audited financials for credit application ${creditApplicationId}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
