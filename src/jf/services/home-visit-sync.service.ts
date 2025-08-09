import { Injectable, Logger } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { HomeVisitDbService } from './home-visit-db.service';

@Injectable()
export class HomeVisitSyncService {
  private readonly logger = new Logger(HomeVisitSyncService.name);

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly homeVisitDbService: HomeVisitDbService,
  ) {}

  async syncAllToSheets() {
    try {
      this.logger.log('Syncing all home visits to sheets');

      const unsyncedRecords = await this.homeVisitDbService.findUnsynced();
      this.logger.log(`Found ${unsyncedRecords.length} unsynced home visits`);

      let successCount = 0;
      let errorCount = 0;

      for (const record of unsyncedRecords) {
        try {
          await this.syncHomeVisitToSheet(record);
          await this.homeVisitDbService.updateSyncStatus(record.id, true);
          successCount++;
        } catch (error) {
          this.logger.error(`Error syncing home visit ${record.id}:`, error);
          errorCount++;
        }
      }

      this.logger.log(
        `Sync completed. Success: ${successCount}, Errors: ${errorCount}`,
      );

      return {
        success: true,
        message: `Synced ${successCount} home visits to sheets`,
        data: {
          successCount,
          errorCount,
          totalRecords: unsyncedRecords.length,
        },
      };
    } catch (error) {
      this.logger.error('Error syncing all home visits to sheets:', error);
      throw error;
    }
  }

  async syncHomeVisitToSheet(record: any, operation?: 'create' | 'update') {
    try {
      this.logger.log(
        `Syncing home visit ${record.id} to sheets (operation: ${operation})`,
      );

      const creditApplicationId = record.creditApplicationId;
      const sheetId = record.sheetId;

      this.logger.debug(`Syncing home visit:`, {
        creditApplicationId,
        sheetId,
        dbId: record.id,
        synced: record.synced,
        operation,
      });

      if (!creditApplicationId) {
        throw new Error(
          'Home visit has no Credit Application ID for identification',
        );
      }

      // For HomeVisits, the sheetId is always the actual ID in the sheet
      // Check if record already exists in sheets
      const existingRecord = await this.findExistingHomeVisitInSheets(sheetId);
      this.logger.debug(
        `Existing record check result:`,
        existingRecord ? 'Found' : 'Not found',
      );

      // Use operation parameter to determine action
      if (operation === 'update' && existingRecord) {
        // Update existing record
        this.logger.debug(
          `Updating existing home visit in sheet by sheetId: ${sheetId}`,
        );
        const sheetData = this.homeVisitDbService.convertDbDataToSheet(record);
        await this.sheetsService.updateHomeVisit(sheetId, sheetData);
        this.logger.debug(
          `Updated existing home visit in sheet: ${creditApplicationId} (sheetId: ${sheetId})`,
        );
      } else if (operation === 'create' || !existingRecord) {
        // Create new record
        this.logger.debug(`Creating new home visit in Google Sheets`);
        const sheetData = this.homeVisitDbService.convertDbDataToSheet(record);
        const newRecord = await this.sheetsService.addHomeVisit(sheetData);
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
      await this.homeVisitDbService.updateSyncStatus(record.id, true);

      this.logger.log(`Successfully synced home visit ${record.id} to sheets`);
    } catch (error) {
      this.logger.error(
        `Error syncing home visit ${record.id} to sheets:`,
        error,
      );
      throw error;
    }
  }

  async syncHomeVisitById(id: number, operation?: 'create' | 'update') {
    try {
      this.logger.log(`Syncing home visit by ID: ${id} (${operation})`);

      const record = await this.homeVisitDbService.findById(id.toString());
      if (!record) {
        throw new Error(`Home visit with ID ${id} not found`);
      }

      await this.syncHomeVisitToSheet(record, operation);

      return {
        success: true,
        message: `Successfully synced home visit ${id} to sheets`,
      };
    } catch (error) {
      this.logger.error(`Error syncing home visit ${id}:`, error);
      throw error;
    }
  }

  async syncByCreditApplicationId(creditApplicationId: string) {
    try {
      this.logger.log(
        `Syncing home visits for credit application: ${creditApplicationId}`,
      );

      const records =
        await this.homeVisitDbService.findByCreditApplicationId(
          creditApplicationId,
        );
      this.logger.log(
        `Found ${records.length} records for credit application ${creditApplicationId}`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await this.syncHomeVisitToSheet(record);
          successCount++;
        } catch (error) {
          this.logger.error(`Error syncing record ${record.id}:`, error);
          errorCount++;
        }
      }

      return {
        success: true,
        message: `Synced ${successCount} home visits for credit application ${creditApplicationId}`,
        data: { successCount, errorCount, totalRecords: records.length },
      };
    } catch (error) {
      this.logger.error(
        `Error syncing home visits for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  private async findExistingHomeVisitInSheets(identifier: string) {
    try {
      if (!identifier) {
        return null;
      }

      const records = await this.sheetsService.getHomeVisits();
      this.logger.debug(`Found ${records.length} records in sheets`);
      this.logger.debug(`Looking for identifier: ${identifier}`);

      // For HomeVisits, the identifier is always the sheetId
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
      this.logger.error(`Error finding existing home visit in sheets:`, error);
      return null;
    }
  }
}
