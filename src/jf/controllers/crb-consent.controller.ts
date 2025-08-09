import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Logger,
  UseInterceptors,
  UploadedFile,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { CrbConsentDbService } from '../services/crb-consent-db.service';
import { CrbConsentSyncService } from '../services/crb-consent-sync.service';
import { FileUploadService } from '../services/file-upload.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { CreateCrbConsentDto } from '../dto/create-crb-consent.dto';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/crb-consent')
export class CrbConsentController {
  private readonly logger = new Logger(CrbConsentController.name);
  private readonly SHEET_NAME = 'CRB Consent';
  private readonly USERS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_USERS_IMAGES_FOLDER_ID;
  private readonly USERS_IMAGES_FOLDER_NAME =
    process.env.GOOGLE_DRIVE_USERS_IMAGES_FOLDER_NAME;
  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly crbConsentDbService: CrbConsentDbService,
    private readonly crbConsentSyncService: CrbConsentSyncService,
    private readonly fileUploadService: FileUploadService,
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}

  @Get('by-borrower/:borrowerId')
  async getConsentsByBorrower(@Param('borrowerId') borrowerId: string) {
    this.logger.log(`Getting CRB consents for borrower: ${borrowerId}`);
    try {
      const consents =
        await this.crbConsentDbService.findByBorrowerId(borrowerId);
      const consentsInSheetFormat =
        this.crbConsentDbService.convertDbArrayToSheet(consents);

      // Add Google Drive links for document columns
      const documentColumns = ['Signature'];
      const consentsWithLinks = await Promise.all(
        consentsInSheetFormat.map(async (consent) => {
          const consentWithLinks = { ...consent };
          for (const column of documentColumns) {
            if (consent[column]) {
              const filename = consent[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.USERS_IMAGES_FOLDER_ID,
              );
              consentWithLinks[column] = fileLink;
            }
          }
          return consentWithLinks;
        }),
      );

      return {
        success: true,
        count: consents.length,
        data: consentsWithLinks,
        source: 'postgres',
        borrowerId: borrowerId,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to fetch CRB consents: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('signature'))
  async addConsent(
    @Body() consentData: CreateCrbConsentDto,
    @UploadedFile() signature?: Express.Multer.File,
  ) {
    try {
      this.logger.log(
        `Adding new CRB consent for borrower: ${consentData['Borrower ID']}`,
      );

      // Save signature locally if provided
      let signaturePath = '';
      if (signature) {
        const customName = `crb_consent_signature_${consentData['Borrower ID']}`;
        signaturePath = await this.fileUploadService.saveFile(
          signature,
          'crb-consents',
          customName,
        );
      }

      // Generate a temporary sheetId for new consent
      const temporarySheetId = `CRB-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      // Prepare consent data for database
      const consentDataForDb = {
        sheetId: temporarySheetId,
        borrowerId: consentData['Borrower ID'],
        agreement: consentData['Agreement'] || '',
        signedByName: consentData['Signed By Name'],
        date: consentData['Date'] || '',
        roleInOrganization: consentData['Role in Organization'] || '',
        signature: signaturePath || '',
        synced: false,
      };

      // Save to database first
      const result = await this.crbConsentDbService.create(consentDataForDb);
      this.logger.log(`CRB consent added successfully via Postgres`);

      // Queue signature upload to Google Drive if provided
      if (signature) {
        const customName = `crb_consent_signature_${consentData['Borrower ID']}`;
        this.backgroundUploadService.queueFileUpload(
          signaturePath,
          `${customName}_${Date.now()}.${signature.originalname.split('.').pop()}`,
          this.USERS_IMAGES_FOLDER_ID,
          signature.mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          result.id, // Pass consent ID
          'signature', // Pass field name
        );
      }

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(result.id, result.borrowerId, 'create');

      return {
        success: true,
        data: result,
        message: 'CRB consent added successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to add CRB consent: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Get(':consentId')
  async getConsentById(@Param('consentId') consentId: string) {
    try {
      this.logger.log(`Fetching CRB consent: ${consentId}`);

      const consent = await this.crbConsentDbService.findById(consentId);
      if (!consent) {
        return {
          success: false,
          error: 'Consent not found',
        };
      }

      const consentInSheetFormat =
        this.crbConsentDbService.convertDbToSheet(consent);

      // Add Google Drive link for signature if it exists
      if (consentInSheetFormat['Signature']) {
        const filename = consentInSheetFormat['Signature'].split('/').pop();
        const fileLink = await this.googleDriveService.getFileLink(
          filename,
          this.USERS_IMAGES_FOLDER_ID,
        );
        consentInSheetFormat['Signature'] = fileLink;
      }

      return {
        success: true,
        data: consentInSheetFormat,
        source: 'postgres',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to fetch CRB consent: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Put(':consentId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('signature'))
  async updateConsent(
    @Param('consentId') consentId: string,
    @Body() updateData: Partial<CreateCrbConsentDto>,
    @UploadedFile() signature?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating CRB consent: ${consentId}`);

      // Check if consent exists
      const existingConsent =
        await this.crbConsentDbService.findById(consentId);
      if (!existingConsent) {
        return {
          success: false,
          error: 'CRB consent not found',
        };
      }

      // Save signature locally if provided
      if (signature) {
        const customName = `crb_consent_signature_${updateData['Borrower ID'] || existingConsent.borrowerId}`;
        const signaturePath = await this.fileUploadService.saveFile(
          signature,
          'crb-consents',
          customName,
        );

        // Queue signature upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          signaturePath,
          `${customName}_${Date.now()}.${signature.originalname.split('.').pop()}`,
          this.USERS_IMAGES_FOLDER_ID,
          signature.mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          existingConsent.id, // Pass consent ID
          'signature', // Pass field name
        );

        updateData['Signature'] = signaturePath;
      }

      // Prepare update data for database
      const updateDataForDb: any = {};
      if (updateData['Borrower ID'])
        updateDataForDb.borrowerId = updateData['Borrower ID'];
      if (updateData['Agreement'])
        updateDataForDb.agreement = updateData['Agreement'];
      if (updateData['Signed By Name'])
        updateDataForDb.signedByName = updateData['Signed By Name'];
      if (updateData['Date']) updateDataForDb.date = updateData['Date'];
      if (updateData['Role in Organization'])
        updateDataForDb.roleInOrganization = updateData['Role in Organization'];
      if (updateData['Signature'])
        updateDataForDb.signature = updateData['Signature'];

      // Mark as unsynced since we're updating the record
      updateDataForDb.synced = false;

      // Update in database
      const result = await this.crbConsentDbService.update(
        consentId,
        updateDataForDb,
      );
      this.logger.log(`CRB consent updated successfully via Postgres`);

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(result.id, result.borrowerId, 'update');

      return {
        success: true,
        data: result,
        message: 'CRB consent updated successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to update CRB consent: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  private async triggerBackgroundSync(
    consentId: number,
    borrowerId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for ID: ${consentId}, Borrower ID: ${borrowerId}, Action: ${operation}`,
      );
      const syncResult =
        await this.crbConsentSyncService.syncConsentById(consentId);
      this.logger.log(
        `Background sync completed for ID: ${consentId}, Borrower ID: ${borrowerId}, Action: ${operation}: ${syncResult.synced} consents synced, ${syncResult.errors} errors`,
      );
    } catch (syncError) {
      this.logger.error(
        `Background sync failed for ID: ${consentId}, Borrower ID: ${borrowerId}, Action: ${operation}: ${syncError}`,
      );
    }
  }

  /**
   * Get upload queue status
   */
  @Get('upload-queue/status')
  async getUploadQueueStatus() {
    return this.backgroundUploadService.getQueueStatus();
  }

  /**
   * Sync missing sheetIds
   */
  @Post('sync-missing-sheetids')
  async syncMissingSheetIds() {
    try {
      this.logger.log('Syncing CRB consents with missing sheetIds');
      const result = await this.crbConsentSyncService.syncAllToSheets();
      return { success: true, ...result };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync missing sheetIds: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get CRB consents with missing sheetIds
   */
  @Get('missing-sheetids')
  async getMissingSheetIds() {
    try {
      const consents = await this.crbConsentDbService.findAll();
      const missingSheetIds = consents.filter(
        (consent) => !consent.sheetId || consent.sheetId.startsWith('CRB-'),
      );
      return {
        success: true,
        count: missingSheetIds.length,
        data: missingSheetIds,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get missing sheetIds: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}
