import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { ReferrersDbService } from '../services/referrers-db.service';
import { ReferrersSyncService } from '../services/referrers-sync.service';
import { FileUploadService } from '../services/file-upload.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { CreateReferrerDto } from '../dto/create-referrer.dto';

@Controller('jf/referrers')
export class ReferrersController {
  private readonly logger = new Logger(ReferrersController.name);
  private readonly SHEET_NAME = 'Referrers';
  private readonly PROOF_FOLDER_ID = '191bBnDWzo18cF6ofK4dkEFf48SRK_Suq';
  private readonly PROOF_FOLDER_NAME = 'Referrers_Images';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly referrersDbService: ReferrersDbService,
    private readonly referrersSyncService: ReferrersSyncService,
    private readonly fileUploadService: FileUploadService,
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('proofOfPayment'))
  async addReferrer(
    @Body() referrerData: CreateReferrerDto,
    @UploadedFile() proofOfPayment?: Express.Multer.File,
  ) {
    try {
      this.logger.log('Adding new referrer via Postgres');

      if (!referrerData['School ID']) {
        return {
          success: false,
          error: 'School ID is required',
        };
      }

      // Save file locally first for faster response
      let proofOfPaymentPath = '';

      if (proofOfPayment) {
        const customName = `proof_of_payment_${referrerData['School ID']}`;
        proofOfPaymentPath = await this.fileUploadService.saveFile(
          proofOfPayment,
          'referrers',
          customName,
        );
      }

      // Prepare referrer data for Postgres
      const referrerDataForDb = {
        sheetId: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Generate temporary sheetId
        schoolId: referrerData['School ID'],
        referrerName: referrerData['Referrer Name'],
        mpesaNumber: referrerData['M Pesa Number'] || '',
        referralRewardPaid: referrerData['Referral Reward Paid?'] || '',
        datePaid: referrerData['Date Paid'] || '',
        amountPaid: referrerData['Amount Paid'] || '',
        proofOfPayment: proofOfPaymentPath || '',
        synced: false,
      };

      const result = await this.referrersDbService.create(referrerDataForDb);
      this.logger.log(`Referrer added successfully via Postgres`);

      // Queue file upload to Google Drive with referrer ID for database updates
      if (proofOfPayment) {
        const customName = `proof_of_payment_${referrerData['School ID']}`;
        this.backgroundUploadService.queueFileUpload(
          proofOfPaymentPath,
          `${customName}_${Date.now()}.${proofOfPayment.originalname.split('.').pop()}`,
          this.PROOF_FOLDER_ID,
          proofOfPayment.mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          undefined, // consentId (not applicable)
          undefined, // consentFieldName (not applicable)
          result.id, // Pass referrer ID
          'proofOfPayment', // Pass field name
        );
      }

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(result.id, result.schoolId, 'create');

      return {
        success: true,
        data: result,
        message: 'Referrer added successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to add referrer: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync for a referrer
   */
  private async triggerBackgroundSync(
    referrerId: number,
    schoolId: string,
    action: 'create' | 'update',
  ): Promise<void> {
    try {
      this.logger.log(
        `Triggering background sync for referrer ${referrerId} (${action})`,
      );
      await this.referrersSyncService.syncReferrerById(referrerId);
      this.logger.log(
        `Successfully synced referrer ${referrerId} to Google Sheets`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync referrer ${referrerId} to Google Sheets:`,
        error,
      );
    }
  }

  @Get()
  async getAllReferrers() {
    try {
      this.logger.log('Fetching all referrers');

      const referrers = await this.referrersDbService.findAll();
      this.logger.log(`Found ${referrers.length} referrers`);

      // Convert to sheet format to maintain API compatibility
      const referrersInSheetFormat =
        this.referrersDbService.convertDbArrayToSheet(referrers);

      // Convert local file paths to Google Drive URLs
      const dataWithLinks = await Promise.all(
        referrersInSheetFormat.map(async (referrer) => {
          const referrerWithLinks = { ...referrer };

          // Convert proof of payment file path to Google Drive URL
          if (
            referrer['Proof of Payment'] &&
            referrer['Proof of Payment'].startsWith('/uploads/')
          ) {
            const filename = referrer['Proof of Payment'].split('/').pop();
            try {
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.PROOF_FOLDER_ID,
              );
              referrerWithLinks['Proof of Payment'] = fileLink;
            } catch (error) {
              this.logger.warn(
                `Failed to get Google Drive link for file: ${filename}`,
              );
              // Keep the local path if Google Drive link fails
            }
          }

          return referrerWithLinks;
        }),
      );

      return {
        success: true,
        count: referrers.length,
        data: dataWithLinks,
      };
    } catch (error) {
      const errMsg =
        error instanceof Error && error.message
          ? error.message
          : 'Unknown error';
      this.logger.error('Error fetching all referrers:', error);
      return { success: false, error: errMsg };
    }
  }

  @Get('by-borrower/:schoolId')
  async getReferrersBySchool(@Param('schoolId') schoolId: string) {
    try {
      this.logger.log(`Fetching referrers for school ID: ${schoolId}`);

      const referrers = await this.referrersDbService.findBySchoolId(schoolId);
      this.logger.log(
        `Found ${referrers.length} referrers for school ${schoolId}`,
      );

      // Convert to sheet format to maintain API compatibility
      const referrersInSheetFormat =
        this.referrersDbService.convertDbArrayToSheet(referrers);

      // Convert local file paths to Google Drive URLs
      const dataWithLinks = await Promise.all(
        referrersInSheetFormat.map(async (referrer) => {
          const referrerWithLinks = { ...referrer };

          // Convert proof of payment file path to Google Drive URL
          if (
            referrer['Proof of Payment'] &&
            referrer['Proof of Payment'].startsWith('/uploads/')
          ) {
            const filename = referrer['Proof of Payment'].split('/').pop();
            try {
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.PROOF_FOLDER_ID,
              );
              referrerWithLinks['Proof of Payment'] = fileLink;
            } catch (error) {
              this.logger.warn(
                `Failed to get Google Drive link for file: ${filename}`,
              );
              // Keep the local path if Google Drive link fails
            }
          }

          return referrerWithLinks;
        }),
      );

      return {
        success: true,
        count: referrers.length,
        data: dataWithLinks,
      };
    } catch (error) {
      const errMsg =
        error instanceof Error && error.message
          ? error.message
          : 'Unknown error';
      this.logger.error('Error fetching referrers:', error);
      return { success: false, error: errMsg };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('proofOfPayment'))
  async updateReferrer(
    @Param('id') id: string,
    @Body() referrerData: CreateReferrerDto,
    @UploadedFile() proofOfPayment?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating referrer with ID: ${id}`);

      // Find the existing referrer by sheetId (since the id parameter is the sheetId)
      const existingReferrer = await this.referrersDbService.findBySheetId(id);
      if (!existingReferrer) {
        return { success: false, error: 'Referrer not found' };
      }

      // Handle file upload if provided
      let proofOfPaymentPath = existingReferrer.proofOfPayment || '';

      if (proofOfPayment) {
        const customName = `proof_of_payment_${referrerData['School ID'] || existingReferrer.schoolId}`;
        proofOfPaymentPath = await this.fileUploadService.saveFile(
          proofOfPayment,
          'referrers',
          customName,
        );

        // Queue file upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          proofOfPaymentPath,
          `${customName}_${Date.now()}.${proofOfPayment.originalname.split('.').pop()}`,
          this.PROOF_FOLDER_ID,
          proofOfPayment.mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          undefined, // consentId (not applicable)
          undefined, // consentFieldName (not applicable)
          existingReferrer.id, // Pass referrer ID
          'proofOfPayment', // Pass field name
        );
      }

      // Prepare update data
      const updateData = {
        schoolId: referrerData['School ID'] || existingReferrer.schoolId,
        referrerName:
          referrerData['Referrer Name'] || existingReferrer.referrerName,
        mpesaNumber:
          referrerData['M Pesa Number'] || existingReferrer.mpesaNumber,
        referralRewardPaid:
          referrerData['Referral Reward Paid?'] ||
          existingReferrer.referralRewardPaid,
        datePaid: referrerData['Date Paid'] || existingReferrer.datePaid,
        amountPaid: referrerData['Amount Paid'] || existingReferrer.amountPaid,
        proofOfPayment: proofOfPaymentPath,
        synced: false, // Mark as unsynced to trigger sync
      };

      const result = await this.referrersDbService.update(id, updateData);
      this.logger.log(`Referrer updated successfully via Postgres`);

      // Trigger background sync
      this.triggerBackgroundSync(result.id, result.schoolId, 'update');

      return {
        success: true,
        data: result,
        message: 'Referrer updated successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to update referrer: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync/:id')
  async syncReferrerById(@Param('id') id: string) {
    try {
      this.logger.log(`Manually syncing referrer with ID: ${id}`);

      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        return { success: false, error: 'Invalid referrer ID' };
      }

      const result =
        await this.referrersSyncService.syncReferrerById(numericId);

      return {
        success: true,
        message: 'Referrer sync completed',
        data: result,
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to sync referrer: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllReferrers() {
    try {
      this.logger.log('Manually syncing all referrers');

      const result = await this.referrersSyncService.syncAllToSheets();

      return {
        success: true,
        message: 'All referrers sync completed',
        data: result,
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to sync all referrers: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
