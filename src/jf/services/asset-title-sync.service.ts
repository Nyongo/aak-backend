import { Injectable, Logger } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { AssetTitleDbService } from './asset-title-db.service';

@Injectable()
export class AssetTitleSyncService {
  private readonly logger = new Logger(AssetTitleSyncService.name);

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly assetTitleDbService: AssetTitleDbService,
  ) {}

  async syncAllToSheets() {
    try {
      this.logger.log('Syncing all asset titles to sheets');

      const unsyncedRecords = await this.assetTitleDbService.findUnsynced();
      this.logger.log(`Found ${unsyncedRecords.length} unsynced asset titles`);

      let successCount = 0;
      let errorCount = 0;

      for (const record of unsyncedRecords) {
        try {
          await this.syncAssetTitleToSheet(record);
          await this.assetTitleDbService.updateSyncStatus(record.id, true);
          successCount++;
        } catch (error) {
          this.logger.error(`Error syncing asset title ${record.id}:`, error);
          errorCount++;
        }
      }

      this.logger.log(
        `Sync completed. Success: ${successCount}, Errors: ${errorCount}`,
      );

      return {
        success: true,
        message: `Synced ${successCount} asset titles to sheets`,
        data: {
          successCount,
          errorCount,
          totalRecords: unsyncedRecords.length,
        },
      };
    } catch (error) {
      this.logger.error('Error syncing all asset titles to sheets:', error);
      throw error;
    }
  }

  async syncAssetTitleToSheet(record: any, operation?: 'create' | 'update') {
    try {
      this.logger.log(
        `Syncing asset title ${record.id} to sheets (operation: ${operation})`,
      );

      const creditApplicationId = record.creditApplicationId;
      const sheetId = record.sheetId;

      this.logger.debug(`Syncing asset title:`, {
        creditApplicationId,
        sheetId,
        dbId: record.id,
        synced: record.synced,
        operation,
      });

      if (!creditApplicationId) {
        throw new Error(
          'Asset title has no Credit Application ID for identification',
        );
      }

      // For AssetTitles, the sheetId is always the actual ID in the sheet
      // Check if record already exists in sheets
      const existingRecord = await this.findExistingAssetTitleInSheets(sheetId);
      this.logger.debug(
        `Existing record check result:`,
        existingRecord ? 'Found' : 'Not found',
      );

      // Use operation parameter to determine action
      if (operation === 'update' && existingRecord) {
        // Update existing record
        this.logger.debug(
          `Updating existing asset title in sheet by sheetId: ${sheetId}`,
        );
        const sheetData = this.assetTitleDbService.convertDbDataToSheet(record);
        await this.sheetsService.updateAssetTitle(sheetId, sheetData);
        this.logger.debug(
          `Updated existing asset title in sheet: ${creditApplicationId} (sheetId: ${sheetId})`,
        );
      } else if (operation === 'create' || !existingRecord) {
        // Create new record
        this.logger.debug(`Creating new asset title in Google Sheets`);
        const sheetData = this.assetTitleDbService.convertDbDataToSheet(record);
        const newRecord = await this.sheetsService.addAssetTitle(sheetData);
        this.logger.debug(
          `Successfully created new record in Google Sheets: ${newRecord?.ID}`,
        );
      } else {
        // This should not happen, but log it
        this.logger.warn(
          `Unexpected scenario: operation=${operation}, existingRecord=${!!existingRecord}`,
        );
      }

      // Mark as synced
      await this.assetTitleDbService.updateSyncStatus(record.id, true);

      this.logger.log(`Successfully synced asset title ${record.id} to sheets`);
    } catch (error) {
      this.logger.error(
        `Error syncing asset title ${record.id} to sheets:`,
        error,
      );
      throw error;
    }
  }

  async syncAssetTitleById(id: number, operation?: 'create' | 'update') {
    try {
      this.logger.log(`Syncing asset title by ID: ${id} (${operation})`);

      const record = await this.assetTitleDbService.findById(id.toString());
      if (!record) {
        throw new Error(`Asset title with ID ${id} not found`);
      }

      await this.syncAssetTitleToSheet(record, operation);

      return {
        success: true,
        message: `Successfully synced asset title ${id} to sheets`,
      };
    } catch (error) {
      this.logger.error(`Error syncing asset title ${id}:`, error);
      throw error;
    }
  }

  async syncByCreditApplicationId(creditApplicationId: string) {
    try {
      this.logger.log(
        `Syncing asset titles for credit application: ${creditApplicationId}`,
      );

      const records =
        await this.assetTitleDbService.findByCreditApplicationId(
          creditApplicationId,
        );
      this.logger.log(
        `Found ${records.length} records for credit application ${creditApplicationId}`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await this.syncAssetTitleToSheet(record);
          successCount++;
        } catch (error) {
          this.logger.error(`Error syncing record ${record.id}:`, error);
          errorCount++;
        }
      }

      return {
        success: true,
        message: `Synced ${successCount} asset titles for credit application ${creditApplicationId}`,
        data: { successCount, errorCount, totalRecords: records.length },
      };
    } catch (error) {
      this.logger.error(
        `Error syncing asset titles for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  private async findExistingAssetTitleInSheets(identifier: string) {
    try {
      if (!identifier) {
        return null;
      }

      const records = await this.sheetsService.getAssetTitles();
      this.logger.debug(`Found ${records.length} records in sheets`);
      this.logger.debug(`Looking for identifier: ${identifier}`);

      // For AssetTitles, the identifier is always the sheetId
      // Find record by ID
      const recordBySheetId = records.find(
        (record) => record.ID === identifier,
      );

      if (recordBySheetId) {
        this.logger.debug(`Found existing record with ID: ${identifier}`);
        return recordBySheetId;
      }

      // Debug: Log the first few records to see their structure
      if (records.length > 0) {
        this.logger.debug(`First record structure:`, records[0]);
        this.logger.debug(
          `Available IDs in records:`,
          records.map((r) => r.ID).slice(0, 5),
        );

        // Check if there are any records with similar IDs
        const similarRecords = records.filter(
          (r) => r.ID && r.ID.includes(identifier.substring(0, 10)),
        );
        if (similarRecords.length > 0) {
          this.logger.debug(
            `Found similar records:`,
            similarRecords.map((r) => r.ID),
          );
        }
      }

      this.logger.debug(
        `No existing record found for identifier: ${identifier}`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error finding existing asset title in sheets:`, error);
      return null;
    }
  }
}
