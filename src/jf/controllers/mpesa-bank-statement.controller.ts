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
import { CreateMpesaBankStatementDto } from '../dto/create-mpesa-bank-statement.dto';
import { MpesaBankStatementDbService } from '../services/mpesa-bank-statement-db.service';
import { MpesaBankStatementSyncService } from '../services/mpesa-bank-statement-sync.service';
import { FileUploadService } from '../services/file-upload.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/bank-statements')
export class MpesaBankStatementController {
  private readonly logger = new Logger(MpesaBankStatementController.name);
  private readonly GOOGLE_DRIVE_FINANCIAL_RECORDS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_FINANCIAL_RECORDS_IMAGES_FOLDER_ID;
  private readonly GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID;

  constructor(
    private readonly mpesaBankStatementDbService: MpesaBankStatementDbService,
    private readonly mpesaBankStatementSyncService: MpesaBankStatementSyncService,
    private readonly fileUploadService: FileUploadService,
    private readonly backgroundUploadService: BackgroundUploadService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'statement', maxCount: 1 },
      { name: 'convertedExcelFile', maxCount: 1 },
    ]),
  )
  async createStatement(
    @Body()
    createDto: CreateMpesaBankStatementDto,
    @UploadedFiles()
    files: {
      statement?: Express.Multer.File[];
      convertedExcelFile?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(
        `Creating mpesa bank statement for application: ${createDto.creditApplicationId}`,
      );

      if (!createDto.creditApplicationId) {
        return {
          success: false,
          error: 'Credit Application ID is required',
        };
      }

      // Save files locally first for faster response
      let statementPath = '';
      let convertedExcelPath = '';
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

      if (files.statement?.[0]) {
        const customName = `stmt_${createDto.creditApplicationId}`;
        statementPath = await this.fileUploadService.saveFile(
          files.statement[0],
          'mpesa-bank-statements',
          customName,
        );
      }

      if (files.convertedExcelFile?.[0]) {
        const customName = `stmt_converted_${createDto.creditApplicationId}`;
        convertedExcelPath = await this.fileUploadService.saveFile(
          files.convertedExcelFile[0],
          'mpesa-bank-statements',
          customName,
        );
      }

      // Prepare mpesa bank statement data for Postgres
      const mpesaBankStatementDataForDb = {
        sheetId: `STMT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Generate temporary sheetId
        creditApplicationId: createDto.creditApplicationId,
        personalOrBusinessAccount: createDto.personalOrBusinessAccount,
        type: createDto.type,
        accountDetails: createDto.accountDetails,
        description: createDto.description,
        statement: statementPath || '',
        statementStartDate: createDto.statementStartDate,
        statementEndDate: createDto.statementEndDate,
        totalRevenue: Number(createDto.totalRevenue),
        convertedExcelFile: convertedExcelPath || '',
        synced: false,
        createdAt: new Date(createdAt),
      };

      const result = await this.mpesaBankStatementDbService.create(
        mpesaBankStatementDataForDb,
      );
      this.logger.log(`Mpesa bank statement created successfully via Postgres`);

      // Queue file uploads to Google Drive with mpesa bank statement ID for database updates
      if (files.statement?.[0]) {
        const customName = `stmt_${createDto.creditApplicationId}`;
        this.backgroundUploadService.queueFileUpload(
          statementPath,
          `${customName}_${Date.now()}.${files.statement[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID,
          files.statement[0].mimetype,
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
          result.id, // Pass mpesa bank statement ID
          'statement', // Pass field name
        );
      }

      if (files.convertedExcelFile?.[0]) {
        const customName = `stmt_converted_${createDto.creditApplicationId}`;
        this.backgroundUploadService.queueFileUpload(
          convertedExcelPath,
          `${customName}_${Date.now()}.${files.convertedExcelFile[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID,
          files.convertedExcelFile[0].mimetype,
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
          result.id, // Pass mpesa bank statement ID
          'convertedExcelFile', // Pass field name
        );
      }

      // Trigger sync only if no files were uploaded (to avoid duplicate syncs)
      // If files were uploaded, sync will be triggered by background upload service
      if (!files.statement?.[0] && !files.convertedExcelFile?.[0]) {
        this.triggerBackgroundSync(
          result.id,
          result.creditApplicationId,
          'create',
        );
      }

      return {
        success: true,
        data: result,
        message: 'Statement record created successfully',
        sync: {
          triggered: !files.statement?.[0] && !files.convertedExcelFile?.[0],
          status:
            !files.statement?.[0] && !files.convertedExcelFile?.[0]
              ? 'immediate'
              : 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to create mpesa bank statement: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync for mpesa bank statement
   */
  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for mpesa bank statement ${dbId} (${operation})`,
      );
      await this.mpesaBankStatementSyncService.syncMpesaBankStatementById(
        dbId,
        operation,
      );
      this.logger.log(
        `Background sync triggered successfully for mpesa bank statement ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger background sync for mpesa bank statement ${dbId}: ${error}`,
      );
    }
  }

  @Get('by-application/:creditApplicationId')
  async getStatementsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching statements for application ID: ${creditApplicationId}`,
      );

      const mpesaBankStatements =
        await this.mpesaBankStatementDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      // Convert database records to original sheet format for frontend compatibility
      const mpesaBankStatementsWithOriginalKeys = mpesaBankStatements.map(
        (mpesaBankStatement) => {
          const convertedMpesaBankStatement = {
            ID: mpesaBankStatement.sheetId || '',
            'Credit Application': mpesaBankStatement.creditApplicationId || '',
            'Personal Or Business Account':
              mpesaBankStatement.personalOrBusinessAccount || '',
            Type: mpesaBankStatement.type || '',
            'Account Details': mpesaBankStatement.accountDetails || '',
            Description: mpesaBankStatement.description || '',
            Statement: mpesaBankStatement.statement || '',
            'Statement Start Date': mpesaBankStatement.statementStartDate || '',
            'Statement End Date': mpesaBankStatement.statementEndDate || '',
            'Total Revenue': mpesaBankStatement.totalRevenue?.toString() || '',
            'Converted Excel File': mpesaBankStatement.convertedExcelFile || '',
            'Created At': mpesaBankStatement.createdAt?.toISOString() || '',
            Synced: mpesaBankStatement.synced || false,
          };
          return convertedMpesaBankStatement;
        },
      );

      // Add Google Drive links for document columns
      const documentColumns = ['Statement', 'Converted Excel File'];
      const mpesaBankStatementsWithLinks = await Promise.all(
        mpesaBankStatementsWithOriginalKeys.map(async (mpesaBankStatement) => {
          const mpesaBankStatementWithLinks = { ...mpesaBankStatement };
          for (const column of documentColumns) {
            if (mpesaBankStatement[column]) {
              let folderId = '';
              if (column === 'Statement') {
                folderId = this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID;
              } else if (column === 'Converted Excel File') {
                folderId = this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID;
              }
              const filename = mpesaBankStatement[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                folderId,
              );
              mpesaBankStatementWithLinks[column] = fileLink;
            }
          }
          return mpesaBankStatementWithLinks;
        }),
      );

      return {
        success: true,
        count: mpesaBankStatementsWithLinks.length,
        data: mpesaBankStatementsWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching statements for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllStatements() {
    try {
      this.logger.debug('Fetching all statements');
      const mpesaBankStatements =
        await this.mpesaBankStatementDbService.findAll();

      // Convert database records to original sheet format for frontend compatibility
      const mpesaBankStatementsWithOriginalKeys = mpesaBankStatements.map(
        (mpesaBankStatement) => {
          const convertedMpesaBankStatement = {
            ID: mpesaBankStatement.sheetId || '',
            'Credit Application': mpesaBankStatement.creditApplicationId || '',
            'Personal Or Business Account':
              mpesaBankStatement.personalOrBusinessAccount || '',
            Type: mpesaBankStatement.type || '',
            'Account Details': mpesaBankStatement.accountDetails || '',
            Description: mpesaBankStatement.description || '',
            Statement: mpesaBankStatement.statement || '',
            'Statement Start Date': mpesaBankStatement.statementStartDate || '',
            'Statement End Date': mpesaBankStatement.statementEndDate || '',
            'Total Revenue': mpesaBankStatement.totalRevenue?.toString() || '',
            'Converted Excel File': mpesaBankStatement.convertedExcelFile || '',
            'Created At': mpesaBankStatement.createdAt?.toISOString() || '',
            Synced: mpesaBankStatement.synced || false,
          };
          return convertedMpesaBankStatement;
        },
      );

      return {
        success: true,
        count: mpesaBankStatementsWithOriginalKeys.length,
        data: mpesaBankStatementsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all statements: ${apiError.message}`);
      throw error;
    }
  }

  @Get(':id')
  async getStatementById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching mpesa bank statement with ID: ${id}`);
      const mpesaBankStatement =
        await this.mpesaBankStatementDbService.findById(id);

      if (!mpesaBankStatement) {
        return { success: false, message: 'Statement not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const mpesaBankStatementWithOriginalKeys = {
        ID: mpesaBankStatement.sheetId || '',
        'Credit Application': mpesaBankStatement.creditApplicationId || '',
        'Personal Or Business Account':
          mpesaBankStatement.personalOrBusinessAccount || '',
        Type: mpesaBankStatement.type || '',
        'Account Details': mpesaBankStatement.accountDetails || '',
        Description: mpesaBankStatement.description || '',
        Statement: mpesaBankStatement.statement || '',
        'Statement Start Date': mpesaBankStatement.statementStartDate || '',
        'Statement End Date': mpesaBankStatement.statementEndDate || '',
        'Total Revenue': mpesaBankStatement.totalRevenue?.toString() || '',
        'Converted Excel File': mpesaBankStatement.convertedExcelFile || '',
        'Created At': mpesaBankStatement.createdAt?.toISOString() || '',
        Synced: mpesaBankStatement.synced || false,
      };

      return { success: true, data: mpesaBankStatementWithOriginalKeys };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching statement ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Post('sync/:id')
  async syncMpesaBankStatementById(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync requested for mpesa bank statement: ${id}`);
      const result =
        await this.mpesaBankStatementSyncService.syncMpesaBankStatementById(
          parseInt(id),
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync mpesa bank statement ${id}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllMpesaBankStatements() {
    try {
      this.logger.log('Manual sync requested for all mpesa bank statements');
      const result = await this.mpesaBankStatementSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync all mpesa bank statements: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncMpesaBankStatementsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync requested for mpesa bank statements by credit application: ${creditApplicationId}`,
      );
      const result =
        await this.mpesaBankStatementSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync mpesa bank statements for credit application ${creditApplicationId}: ${apiError.message}`,
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
      { name: 'statement', maxCount: 1 },
      { name: 'convertedExcelFile', maxCount: 1 },
    ]),
  )
  async updateStatement(
    @Param('id') id: string,
    @Body()
    updateDto: Partial<CreateMpesaBankStatementDto>,
    @UploadedFiles()
    files: {
      statement?: Express.Multer.File[];
      convertedExcelFile?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating bank statement with ID: ${id}`);

      // Find the existing mpesa bank statement by sheetId (the id parameter is the sheetId from frontend)
      const existingMpesaBankStatement =
        await this.mpesaBankStatementDbService.findBySheetId(id);
      if (!existingMpesaBankStatement) {
        return { success: false, error: 'Bank statement not found' };
      }

      this.logger.log(
        `Updating mpesa bank statement with sheetId: ${id}, database ID: ${existingMpesaBankStatement.id}`,
      );

      // Handle file uploads if provided
      let statementPath = existingMpesaBankStatement.statement || '';
      let convertedExcelPath =
        existingMpesaBankStatement.convertedExcelFile || '';

      if (files.statement?.[0]) {
        const customName = `stmt_${updateDto.creditApplicationId || existingMpesaBankStatement.creditApplicationId}`;
        this.logger.log(
          `Updating mpesa bank statement ${existingMpesaBankStatement.id} with new statement file upload`,
        );
        statementPath = await this.fileUploadService.saveFile(
          files.statement[0],
          'mpesa-bank-statements',
          customName,
        );

        // Queue statement file upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          statementPath,
          `${customName}_${Date.now()}.${files.statement[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID,
          files.statement[0].mimetype,
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
          existingMpesaBankStatement.id, // Pass mpesa bank statement ID
          'statement', // Pass field name
        );
        this.logger.log(
          `Statement file upload queued for mpesa bank statement update ${existingMpesaBankStatement.id}`,
        );
      }

      if (files.convertedExcelFile?.[0]) {
        const customName = `stmt_converted_${updateDto.creditApplicationId || existingMpesaBankStatement.creditApplicationId}`;
        this.logger.log(
          `Updating mpesa bank statement ${existingMpesaBankStatement.id} with new converted Excel file upload`,
        );
        convertedExcelPath = await this.fileUploadService.saveFile(
          files.convertedExcelFile[0],
          'mpesa-bank-statements',
          customName,
        );

        // Queue converted Excel file upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          convertedExcelPath,
          `${customName}_${Date.now()}.${files.convertedExcelFile[0].originalname.split('.').pop()}`,
          this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID,
          files.convertedExcelFile[0].mimetype,
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
          existingMpesaBankStatement.id, // Pass mpesa bank statement ID
          'convertedExcelFile', // Pass field name
        );
        this.logger.log(
          `Converted Excel file upload queued for mpesa bank statement update ${existingMpesaBankStatement.id}`,
        );
      }

      // Prepare update data
      const updateDataForDb = {
        creditApplicationId:
          updateDto.creditApplicationId ||
          existingMpesaBankStatement.creditApplicationId,
        personalOrBusinessAccount:
          updateDto.personalOrBusinessAccount ||
          existingMpesaBankStatement.personalOrBusinessAccount,
        type: updateDto.type || existingMpesaBankStatement.type,
        accountDetails:
          updateDto.accountDetails || existingMpesaBankStatement.accountDetails,
        description:
          updateDto.description || existingMpesaBankStatement.description,
        statement: statementPath,
        statementStartDate:
          updateDto.statementStartDate ||
          existingMpesaBankStatement.statementStartDate,
        statementEndDate:
          updateDto.statementEndDate ||
          existingMpesaBankStatement.statementEndDate,
        totalRevenue:
          updateDto.totalRevenue !== undefined
            ? Number(updateDto.totalRevenue)
            : existingMpesaBankStatement.totalRevenue,
        convertedExcelFile: convertedExcelPath,
        synced: false, // Mark as unsynced to trigger sync
      };

      // Use the database ID for the update to avoid sheetId conflicts
      const result = await this.mpesaBankStatementDbService.updateById(
        existingMpesaBankStatement.id,
        updateDataForDb,
      );
      this.logger.log(`Mpesa bank statement updated successfully via Postgres`);

      // Trigger sync only if no files were uploaded (to avoid duplicate syncs)
      // If files were uploaded, sync will be triggered by background upload service
      if (!files.statement?.[0] && !files.convertedExcelFile?.[0]) {
        this.triggerBackgroundSync(
          result.id,
          result.creditApplicationId,
          'update',
        );
      }

      return {
        success: true,
        data: result,
        message: 'Bank statement updated successfully',
        sync: {
          triggered: !files.statement?.[0] && !files.convertedExcelFile?.[0],
          status:
            !files.statement?.[0] && !files.convertedExcelFile?.[0]
              ? 'immediate'
              : 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to update mpesa bank statement: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
