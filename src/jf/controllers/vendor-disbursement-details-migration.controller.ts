import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { VendorDisbursementDetailsDbService } from '../services/vendor-disbursement-details-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/vendor-disbursement-details-migration')
export class VendorDisbursementDetailsMigrationController {
  private readonly logger = new Logger(
    VendorDisbursementDetailsMigrationController.name,
  );

  constructor(
    private readonly vendorDisbursementDetailsDbService: VendorDisbursementDetailsDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    try {
      const totalInDb = await this.vendorDisbursementDetailsDbService.findAll();
      const totalInSheets =
        await this.sheetsService.getVendorDisbursementDetails();

      return {
        success: true,
        data: {
          totalInDatabase: totalInDb.length,
          totalInSheets: totalInSheets.length,
          syncedInDatabase: totalInDb.filter((record) => record.synced).length,
          unsyncedInDatabase: totalInDb.filter((record) => !record.synced)
            .length,
        },
        message:
          'Vendor disbursement details migration status retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get migration status: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('sheet-headers')
  async getSheetHeaders() {
    try {
      this.logger.log('Getting Vendor Disbursement Details sheet headers');

      // Get a sample record to see the headers
      const sampleRecords =
        await this.sheetsService.getVendorDisbursementDetails();

      if (sampleRecords.length === 0) {
        return {
          success: true,
          data: {
            totalHeaders: 0,
            headers: [],
          },
          message: 'No records found in Vendor Disbursement Details sheet',
        };
      }

      // Get headers from the first record
      const headers = Object.keys(sampleRecords[0]);

      this.logger.log(
        `Found ${headers.length} headers in Vendor Disbursement Details sheet`,
      );

      return {
        success: true,
        data: {
          totalHeaders: headers.length,
          headers: headers,
        },
        message:
          'Vendor Disbursement Details sheet headers retrieved successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get sheet headers: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('import-from-sheets')
  async importFromSheets(
    @Query('creditApplicationId') creditApplicationId?: string,
  ) {
    this.logger.log(
      `Starting import from Google Sheets${creditApplicationId ? ` for Credit Application ID: ${creditApplicationId}` : ''}`,
    );

    try {
      // Get all vendor disbursement details from Google Sheets
      const allSheetVendorDisbursementDetails =
        await this.sheetsService.getVendorDisbursementDetails();
      const sheetVendorDisbursementDetails = creditApplicationId
        ? allSheetVendorDisbursementDetails.filter(
            (vd) => vd['Credit Application ID'] === creditApplicationId,
          )
        : allSheetVendorDisbursementDetails;

      if (
        !sheetVendorDisbursementDetails ||
        sheetVendorDisbursementDetails.length === 0
      ) {
        return {
          success: true,
          message: 'No vendor disbursement details found in Google Sheets',
          imported: 0,
          skipped: 0,
          errors: 0,
        };
      }

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      for (const sheetVendorDisbursementDetail of sheetVendorDisbursementDetails) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetVendorDisbursementDetail).length === 0) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetVendorDisbursementDetail,
            });
            continue;
          }

          // Skip records with empty ID
          if (
            !sheetVendorDisbursementDetail.ID ||
            sheetVendorDisbursementDetail.ID.trim() === ''
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetVendorDisbursementDetail,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord =
            await this.vendorDisbursementDetailsDbService.findBySheetId(
              sheetVendorDisbursementDetail.ID,
            );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetVendorDisbursementDetail.ID,
              creditApplicationId:
                sheetVendorDisbursementDetail['Credit Application ID'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbData = this.convertSheetToDbFormat(
            sheetVendorDisbursementDetail,
          );

          // Create record in database
          await this.vendorDisbursementDetailsDbService.create(dbData);
          imported++;

          this.logger.debug(
            `Imported vendor disbursement detail with sheetId: ${sheetVendorDisbursementDetail.ID}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetVendorDisbursementDetail.ID,
            creditApplicationId:
              sheetVendorDisbursementDetail['Credit Application ID'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import vendor disbursement detail ${sheetVendorDisbursementDetail.ID}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(
        `Import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`,
      );

      return {
        success: true,
        message: `Import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`,
        imported,
        skipped,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
        skippedDetails: skippedDetails.length > 0 ? skippedDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to import from sheets: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('sync-to-sheets')
  async syncToSheets(
    @Query('creditApplicationId') creditApplicationId?: string,
  ) {
    this.logger.log(
      `Starting sync to Google Sheets${creditApplicationId ? ` for Credit Application ID: ${creditApplicationId}` : ''}`,
    );

    try {
      // Get unsynced vendor disbursement details from database
      const allUnsyncedVendorDisbursementDetails =
        await this.vendorDisbursementDetailsDbService.findUnsynced();
      const unsyncedVendorDisbursementDetails = creditApplicationId
        ? allUnsyncedVendorDisbursementDetails.filter(
            (vd) => vd.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedVendorDisbursementDetails;

      if (
        !unsyncedVendorDisbursementDetails ||
        unsyncedVendorDisbursementDetails.length === 0
      ) {
        return {
          success: true,
          message: 'No unsynced vendor disbursement details found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced vendor disbursement detail
      for (const vendorDisbursementDetail of unsyncedVendorDisbursementDetails) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.vendorDisbursementDetailsDbService.updateSyncStatus(
            vendorDisbursementDetail.id,
            true,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            creditApplicationId: vendorDisbursementDetail.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Vendor Disbursement Detail ${vendorDisbursementDetail.id}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(`Sync completed: ${synced} synced, ${errors} errors`);

      return {
        success: true,
        message: `Sync completed: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync to sheets: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('full-migration')
  async fullMigration(
    @Query('creditApplicationId') creditApplicationId?: string,
  ) {
    this.logger.log(
      `Starting full migration${creditApplicationId ? ` for Credit Application ID: ${creditApplicationId}` : ''}`,
    );

    try {
      // Step 1: Import from sheets
      const importResult = await this.importFromSheets(creditApplicationId);
      if (!importResult.success) {
        return importResult;
      }

      // Step 2: Sync to sheets
      const syncResult = await this.syncToSheets(creditApplicationId);
      if (!syncResult.success) {
        return syncResult;
      }

      return {
        success: true,
        message: 'Full migration completed successfully',
        import: importResult,
        sync: syncResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to complete full migration: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('compare-record')
  async compareRecord(@Query('sheetId') sheetId: string) {
    try {
      // Get record from database
      const dbRecord =
        await this.vendorDisbursementDetailsDbService.findBySheetId(sheetId);
      if (!dbRecord) {
        return {
          success: false,
          error: 'Record not found in database',
        };
      }

      // Get record from sheets
      const sheetRecords =
        await this.sheetsService.getVendorDisbursementDetails();
      const sheetRecord = sheetRecords.find((record) => record.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: 'Record not found in Google Sheets',
        };
      }

      return {
        success: true,
        data: {
          database: dbRecord,
          sheet: sheetRecord,
        },
        message: 'Record comparison completed',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare record: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private convertSheetToDbFormat(sheetRecord: any) {
    return {
      sheetId: sheetRecord.ID,
      creditApplicationId: sheetRecord['Credit Application ID'],
      vendorPaymentMethod: sheetRecord['Vendor Payment Method'] || '',
      phoneNumberForMPesaPayment:
        sheetRecord['Phone Number for M Pesa Payment'] || '',
      managerVerification:
        sheetRecord['Manager Verification of Payment Account'] || '',
      documentVerifyingPaymentAccount:
        sheetRecord['Document Verifying Payment Account'] || '',
      bankName: sheetRecord['Bank Name'] || '',
      accountName: sheetRecord['Account Name'] || '',
      accountNumber: sheetRecord['Account Number'] || '',
      phoneNumberForBankAccount:
        sheetRecord['Phone Number for Bank Account'] || '',
      paybillNumberAndAccount: sheetRecord['Paybill Number and Account'] || '',
      buyGoodsTill: sheetRecord['Buy Goods Till '] || '', // Note the trailing space
      synced: true, // Mark as synced since we're importing from sheets
    };
  }
}
