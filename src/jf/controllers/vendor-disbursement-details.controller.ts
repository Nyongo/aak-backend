import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { VendorDisbursementDetailsDbService } from '../services/vendor-disbursement-details-db.service';
import { VendorDisbursementDetailsSyncService } from '../services/vendor-disbursement-details-sync.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { CreateVendorDisbursementDetailDto } from '../dto/create-vendor-disbursement-detail.dto';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/vendor-disbursement-details')
export class VendorDisbursementDetailsController {
  private readonly logger = new Logger(
    VendorDisbursementDetailsController.name,
  );
  private readonly DISBURSEMENT_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_DISBURSEMENT_FILES_FOLDER_ID;
  private readonly SHEET_NAME = 'Vendor Disbursement Details';
  private readonly docsFolder = 'Vendor Disbursement Details_Files_';
  private readonly imagesFolder = 'Vendor Disbursement Details_Images';
  private readonly GOOGLE_DRIVE_VENDOR_DIS_DOCS_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_VENDOR_DIS_DOCS_FILES_FOLDER_ID;
  private readonly GOOGLE_DRIVE_VENDOR_DIS_DOCS_PHOTOS_FOLDER_ID =
    process.env.GOOGLE_DRIVE_VENDOR_DIS_DOCS_PHOTOS_FOLDER_ID;

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly vendorDisbursementDetailsDbService: VendorDisbursementDetailsDbService,
    private readonly vendorDisbursementDetailsSyncService: VendorDisbursementDetailsSyncService,
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('documentVerifyingPaymentAccount'))
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createDisbursementDetail(
    @Body() createDto: CreateVendorDisbursementDetailDto,
    @UploadedFile() documentVerifyingPaymentAccount: Express.Multer.File,
  ) {
    try {
      this.logger.log('Creating vendor disbursement detail');

      // Generate unique ID for the disbursement detail
      const id = `VD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Save file locally if provided
      let fileName = '';
      if (documentVerifyingPaymentAccount) {
        const file = documentVerifyingPaymentAccount;
        const timestamp = new Date().getTime();
        fileName = `paymentverifdoc_${createDto.creditApplicationId}_${timestamp}.${file.originalname.split('.').pop()}`;

        // Save file locally first
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(
          process.cwd(),
          'uploads',
          'jf',
          'vendor-disbursement-details',
        );

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, file.buffer);

        this.logger.log(`File saved locally: ${filePath}`);
      }

      // Create record in database
      const dbData = {
        sheetId: id,
        creditApplicationId: createDto.creditApplicationId,
        vendorPaymentMethod: createDto.vendorPaymentMethod,
        phoneNumberForMPesaPayment: createDto.phoneNumberForMPesaPayment || '',
        managerVerification: createDto.managerVerification,
        documentVerifyingPaymentAccount: fileName
          ? `${this.imagesFolder}/${fileName}`
          : '',
        bankName: createDto.bankName || '',
        accountName: createDto.accountName || '',
        accountNumber: createDto.accountNumber || '',
        phoneNumberForBankAccount: createDto.phoneNumberForBankAccount || '',
        paybillNumberAndAccount: createDto.paybillNumberAndAccount || '',
        buyGoodsTill: createDto.buyGoodsTill || '',
      };

      const createdRecord =
        await this.vendorDisbursementDetailsDbService.create(dbData);
      this.logger.log(
        `Created record in database with ID: ${createdRecord.id}`,
      );

      // Queue file upload to Google Drive if file was provided
      if (documentVerifyingPaymentAccount && fileName) {
        await this.backgroundUploadService.queueFileUpload(
          `/uploads/jf/vendor-disbursement-details/${fileName}`,
          fileName,
          this.GOOGLE_DRIVE_VENDOR_DIS_DOCS_PHOTOS_FOLDER_ID,
          documentVerifyingPaymentAccount.mimetype,
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
          undefined, // otherSupportingDocId
          undefined, // otherSupportingDocFieldName
          Number(createdRecord.id), // vendorDisbursementDetailId
          'documentVerifyingPaymentAccount', // vendorDisbursementDetailFieldName
          'create', // operation
        );
      }

      // Trigger background sync
      await this.triggerBackgroundSync(
        createdRecord.id,
        createDto.creditApplicationId,
        'create',
      );

      return {
        success: true,
        message: 'Vendor disbursement detail created successfully',
        data: {
          id: createdRecord.id,
          sheetId: createdRecord.sheetId,
          ...dbData,
        },
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating vendor disbursement detail: ${apiError.message}`,
      );
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
        `Triggering background sync for vendor disbursement detail ${dbId} (${operation})`,
      );

      // Trigger sync in the background
      setTimeout(async () => {
        try {
          await this.vendorDisbursementDetailsSyncService.syncVendorDisbursementDetailById(
            dbId,
            operation,
          );
          this.logger.log(
            `Background sync completed for vendor disbursement detail ${dbId}`,
          );
        } catch (error) {
          this.logger.error(
            `Background sync failed for vendor disbursement detail ${dbId}:`,
            error,
          );
        }
      }, 1000);
    } catch (error) {
      this.logger.error(
        `Error triggering background sync for vendor disbursement detail ${dbId}:`,
        error,
      );
    }
  }

  @Get('by-application/:creditApplicationId')
  async getDetailsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching disbursement details for application: ${creditApplicationId}`,
      );

      const records =
        await this.vendorDisbursementDetailsDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (!records || records.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Convert database records to original sheet format for frontend compatibility
      const recordsWithOriginalKeys = records.map((record) => {
        const convertedRecord =
          this.vendorDisbursementDetailsDbService.convertDbDataToSheet(record);

        // Add additional fields that might not be in the mapping
        convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
        convertedRecord['Synced'] = record.synced || false;

        return convertedRecord;
      });

      return {
        success: true,
        count: records.length,
        data: recordsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching disbursement details for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getDetailById(@Param('id') id: string) {
    try {
      this.logger.debug(`Fetching disbursement detail with ID: ${id}`);

      const record = await this.vendorDisbursementDetailsDbService.findById(id);

      if (!record) {
        return { success: false, message: 'Disbursement detail not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const convertedRecord =
        this.vendorDisbursementDetailsDbService.convertDbDataToSheet(record);

      // Add additional fields that might not be in the mapping
      convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
      convertedRecord['Synced'] = record.synced || false;

      return { success: true, data: convertedRecord };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching disbursement detail ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllDetails() {
    try {
      this.logger.debug('Fetching all disbursement details');

      const records = await this.vendorDisbursementDetailsDbService.findAll();

      if (!records || records.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Convert database records to original sheet format for frontend compatibility
      const recordsWithOriginalKeys = records.map((record) => {
        const convertedRecord =
          this.vendorDisbursementDetailsDbService.convertDbDataToSheet(record);

        // Add additional fields that might not be in the mapping
        convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
        convertedRecord['Synced'] = record.synced || false;

        return convertedRecord;
      });

      return {
        success: true,
        count: records.length,
        data: recordsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all disbursement details: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('documentVerifyingPaymentAccount'))
  async updateDisbursementDetail(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateVendorDisbursementDetailDto>,
    @UploadedFile() documentVerifyingPaymentAccount: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating vendor disbursement detail with ID: ${id}`);

      // Find the existing record by sheetId
      const existingRecord =
        await this.vendorDisbursementDetailsDbService.findBySheetId(id);
      if (!existingRecord) {
        return { success: false, message: 'Disbursement detail not found' };
      }

      // Save new file locally if provided
      let fileName = '';
      if (documentVerifyingPaymentAccount) {
        const file = documentVerifyingPaymentAccount;
        const timestamp = new Date().getTime();
        fileName = `paymentverifdoc_${existingRecord.creditApplicationId}_${timestamp}.${file.originalname.split('.').pop()}`;

        // Save file locally first
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(
          process.cwd(),
          'uploads',
          'jf',
          'vendor-disbursement-details',
        );

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, file.buffer);

        this.logger.log(`New file saved locally: ${filePath}`);
      }

      // Prepare update data
      const updateData: any = {};

      if (updateDto.creditApplicationId !== undefined) {
        updateData.creditApplicationId = updateDto.creditApplicationId;
      }
      if (updateDto.vendorPaymentMethod !== undefined) {
        updateData.vendorPaymentMethod = updateDto.vendorPaymentMethod;
      }
      if (updateDto.phoneNumberForMPesaPayment !== undefined) {
        updateData.phoneNumberForMPesaPayment =
          updateDto.phoneNumberForMPesaPayment;
      }
      if (updateDto.managerVerification !== undefined) {
        updateData.managerVerification = updateDto.managerVerification;
      }
      if (updateDto.bankName !== undefined) {
        updateData.bankName = updateDto.bankName;
      }
      if (updateDto.accountName !== undefined) {
        updateData.accountName = updateDto.accountName;
      }
      if (updateDto.accountNumber !== undefined) {
        updateData.accountNumber = updateDto.accountNumber;
      }
      if (updateDto.phoneNumberForBankAccount !== undefined) {
        updateData.phoneNumberForBankAccount =
          updateDto.phoneNumberForBankAccount;
      }
      if (updateDto.paybillNumberAndAccount !== undefined) {
        updateData.paybillNumberAndAccount = updateDto.paybillNumberAndAccount;
      }
      if (updateDto.buyGoodsTill !== undefined) {
        updateData.buyGoodsTill = updateDto.buyGoodsTill;
      }

      // Update document path if new file was uploaded
      if (fileName) {
        updateData.documentVerifyingPaymentAccount = `${this.imagesFolder}/${fileName}`;
      }

      // Update record in database
      const updatedRecord =
        await this.vendorDisbursementDetailsDbService.updateById(
          existingRecord.id,
          updateData,
        );

      // Queue file upload to Google Drive if new file was provided
      if (documentVerifyingPaymentAccount && fileName) {
        await this.backgroundUploadService.queueFileUpload(
          `/uploads/jf/vendor-disbursement-details/${fileName}`,
          fileName,
          this.GOOGLE_DRIVE_VENDOR_DIS_DOCS_PHOTOS_FOLDER_ID,
          documentVerifyingPaymentAccount.mimetype,
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
          undefined, // otherSupportingDocId
          undefined, // otherSupportingDocFieldName
          Number(existingRecord.id), // vendorDisbursementDetailId
          'documentVerifyingPaymentAccount', // vendorDisbursementDetailFieldName
          'update', // operation
        );
      }

      // Trigger background sync
      await this.triggerBackgroundSync(
        existingRecord.id,
        existingRecord.creditApplicationId,
        'update',
      );

      return {
        success: true,
        message: 'Vendor disbursement detail updated successfully',
        data: {
          id: updatedRecord.id,
          sheetId: updatedRecord.sheetId,
          ...updateData,
        },
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error updating vendor disbursement detail: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Delete(':id')
  async deleteDisbursementDetail(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting vendor disbursement detail with ID: ${id}`);

      // Find the existing record by sheetId
      const existingRecord =
        await this.vendorDisbursementDetailsDbService.findBySheetId(id);
      if (!existingRecord) {
        return { success: false, message: 'Disbursement detail not found' };
      }

      // Delete from Google Sheets if the record has a real sheetId (not temporary)
      if (existingRecord.sheetId && !existingRecord.sheetId.startsWith('VD-')) {
        try {
          this.logger.log(
            `Deleting record from Google Sheets with sheetId: ${existingRecord.sheetId}`,
          );
          await this.sheetsService.deleteRow(
            'Vendor Disbursement Details',
            existingRecord.sheetId,
            true,
          );
          this.logger.log(`Successfully deleted record from Google Sheets`);
        } catch (sheetsError: unknown) {
          const error = sheetsError as any;
          this.logger.error(
            `Failed to delete from Google Sheets: ${error.message}`,
          );
          // Continue with database deletion even if sheets deletion fails
        }
      } else {
        this.logger.log(
          `Skipping Google Sheets deletion for temporary sheetId: ${existingRecord.sheetId}`,
        );
      }

      // Delete from database
      await this.vendorDisbursementDetailsDbService.delete(
        existingRecord.id.toString(),
      );

      return {
        success: true,
        message:
          'Vendor disbursement detail deleted successfully from both database and Google Sheets',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error deleting vendor disbursement detail: ${apiError.message}`,
      );
      throw error;
    }
  }

  // Sync endpoints
  @Post('sync/:id')
  async syncVendorDisbursementDetailById(@Param('id') id: string) {
    try {
      this.logger.log(
        `Manual sync requested for vendor disbursement detail: ${id}`,
      );
      const result =
        await this.vendorDisbursementDetailsSyncService.syncVendorDisbursementDetailById(
          parseInt(id),
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Failed to sync vendor disbursement detail ${id}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllVendorDisbursementDetails() {
    try {
      this.logger.log(
        'Manual sync requested for all vendor disbursement details',
      );
      const result =
        await this.vendorDisbursementDetailsSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Failed to sync all vendor disbursement details: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncVendorDisbursementDetailsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync requested for vendor disbursement details by credit application: ${creditApplicationId}`,
      );
      const result =
        await this.vendorDisbursementDetailsSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Failed to sync vendor disbursement details for credit application ${creditApplicationId}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
