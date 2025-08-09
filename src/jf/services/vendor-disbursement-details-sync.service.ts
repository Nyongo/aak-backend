import { Injectable, Logger } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { VendorDisbursementDetailsDbService } from './vendor-disbursement-details-db.service';

@Injectable()
export class VendorDisbursementDetailsSyncService {
  private readonly logger = new Logger(
    VendorDisbursementDetailsSyncService.name,
  );

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly vendorDisbursementDetailsDbService: VendorDisbursementDetailsDbService,
  ) {}

  async syncAllToSheets() {
    try {
      this.logger.log(
        'Starting sync of all vendor disbursement details to sheets',
      );

      const unsyncedRecords =
        await this.vendorDisbursementDetailsDbService.findUnsynced();
      this.logger.log(`Found ${unsyncedRecords.length} unsynced records`);

      let successCount = 0;
      let errorCount = 0;

      for (const record of unsyncedRecords) {
        try {
          await this.syncVendorDisbursementDetailToSheet(record);
          await this.vendorDisbursementDetailsDbService.updateSyncStatus(
            record.id,
            true,
          );
          successCount++;
        } catch (error) {
          this.logger.error(`Error syncing record ${record.id}:`, error);
          errorCount++;
        }
      }

      this.logger.log(
        `Sync completed: ${successCount} successful, ${errorCount} failed`,
      );

      return {
        success: true,
        message: `Synced ${successCount} records to Google Sheets`,
        data: { successCount, errorCount },
      };
    } catch (error) {
      this.logger.error('Error in syncAllToSheets:', error);
      throw error;
    }
  }

  async syncVendorDisbursementDetailToSheet(
    record: any,
    operation?: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Syncing vendor disbursement detail ${record.id} to sheets (operation: ${operation})`,
      );

      const creditApplicationId = record.creditApplicationId;
      const sheetId = record.sheetId;

      this.logger.debug(`Syncing vendor disbursement detail:`, {
        creditApplicationId,
        sheetId,
        dbId: record.id,
        synced: record.synced,
        operation,
      });

      if (!creditApplicationId) {
        throw new Error(
          'Vendor disbursement detail has no Credit Application ID for identification',
        );
      }

      // For VendorDisbursementDetails, the sheetId is always valid (no auto-generated IDs)
      const isValidSheetId = sheetId && sheetId.length > 0;
      const hasTemporarySheetId = false; // This sheet doesn't use temporary IDs

      this.logger.debug(`SheetId analysis:`, {
        sheetId,
        isValidSheetId,
        hasTemporarySheetId,
        creditApplicationId,
        dbId: record.id,
        synced: record.synced,
        operation,
      });

      // For VendorDisbursementDetails, the sheetId is always the actual ID in the sheet
      // Check if record already exists in sheets
      const existingRecord =
        await this.findExistingVendorDisbursementDetailInSheets(sheetId);

      if (existingRecord) {
        // Update existing record
        this.logger.debug(
          `Updating existing vendor disbursement detail in sheet by sheetId: ${sheetId}`,
        );
        const sheetData =
          this.vendorDisbursementDetailsDbService.convertDbDataToSheet(record);
        await this.sheetsService.updateVendorDisbursementDetail(
          sheetId,
          sheetData,
        );
        this.logger.debug(
          `Updated existing vendor disbursement detail in sheet: ${creditApplicationId} (sheetId: ${sheetId})`,
        );
      } else {
        // Create new record
        this.logger.debug(
          `Creating new vendor disbursement detail in Google Sheets`,
        );
        const sheetData =
          this.vendorDisbursementDetailsDbService.convertDbDataToSheet(record);
        const newRecord =
          await this.sheetsService.addVendorDisbursementDetail(sheetData);
        this.logger.debug(
          `Successfully created new record in Google Sheets: ${newRecord?.ID}`,
        );
      }

      // Mark as synced
      await this.vendorDisbursementDetailsDbService.updateSyncStatus(
        record.id,
        true,
      );

      this.logger.log(
        `Successfully synced vendor disbursement detail ${record.id} to sheets`,
      );
    } catch (error) {
      this.logger.error(
        `Error syncing vendor disbursement detail ${record.id} to sheets:`,
        error,
      );
      throw error;
    }
  }

  async syncVendorDisbursementDetailById(
    id: number,
    operation?: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Syncing vendor disbursement detail by ID: ${id} (operation: ${operation})`,
      );

      const record = await this.vendorDisbursementDetailsDbService.findById(
        id.toString(),
      );
      if (!record) {
        throw new Error(`Vendor disbursement detail with ID ${id} not found`);
      }

      // Add operation to record for sync method
      const recordWithOperation = { ...record, operation };

      await this.syncVendorDisbursementDetailToSheet(
        recordWithOperation,
        operation,
      );

      return {
        success: true,
        message: `Successfully synced vendor disbursement detail ${id} to sheets`,
      };
    } catch (error) {
      this.logger.error(
        `Error syncing vendor disbursement detail ${id}:`,
        error,
      );
      throw error;
    }
  }

  async syncByCreditApplicationId(creditApplicationId: string) {
    try {
      this.logger.log(
        `Syncing vendor disbursement details for credit application: ${creditApplicationId}`,
      );

      const records =
        await this.vendorDisbursementDetailsDbService.findByCreditApplicationId(
          creditApplicationId,
        );
      this.logger.log(
        `Found ${records.length} records for credit application ${creditApplicationId}`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await this.syncVendorDisbursementDetailToSheet(record);
          await this.vendorDisbursementDetailsDbService.updateSyncStatus(
            record.id,
            true,
          );
          successCount++;
        } catch (error) {
          this.logger.error(`Error syncing record ${record.id}:`, error);
          errorCount++;
        }
      }

      return {
        success: true,
        message: `Synced ${successCount} vendor disbursement details for credit application ${creditApplicationId}`,
        data: { successCount, errorCount, totalRecords: records.length },
      };
    } catch (error) {
      this.logger.error(
        `Error syncing vendor disbursement details for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  private async findExistingVendorDisbursementDetailInSheets(
    identifier: string,
  ) {
    try {
      if (!identifier) {
        return null;
      }

      const records = await this.sheetsService.getVendorDisbursementDetails();

      // For VendorDisbursementDetails, the identifier is always the sheetId
      // Find record by ID
      const recordBySheetId = records.find(
        (record) => record.ID === identifier,
      );
      if (recordBySheetId) {
        return recordBySheetId;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error finding existing vendor disbursement detail in sheets:`,
        error,
      );
      return null;
    }
  }
}
