import { Injectable, Logger } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { ContractDetailsDbService } from './contract-details-db.service';

@Injectable()
export class ContractDetailsSyncService {
  private readonly logger = new Logger(ContractDetailsSyncService.name);

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly contractDetailsDbService: ContractDetailsDbService,
  ) {}

  async syncAllToSheets() {
    try {
      this.logger.log('Syncing all contract details to sheets');

      const unsyncedRecords =
        await this.contractDetailsDbService.findUnsynced();
      this.logger.log(
        `Found ${unsyncedRecords.length} unsynced contract details`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const record of unsyncedRecords) {
        try {
          await this.syncContractDetailsToSheet(record);
          await this.contractDetailsDbService.updateSyncStatus(record.id, true);
          successCount++;
        } catch (error) {
          this.logger.error(
            `Error syncing contract details ${record.id}:`,
            error,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Sync completed. Success: ${successCount}, Errors: ${errorCount}`,
      );

      return {
        success: true,
        message: `Synced ${successCount} contract details to sheets`,
        data: {
          successCount,
          errorCount,
          totalRecords: unsyncedRecords.length,
        },
      };
    } catch (error) {
      this.logger.error('Error syncing all contract details to sheets:', error);
      throw error;
    }
  }

  async syncContractDetailsToSheet(
    record: any,
    operation?: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Syncing contract details ${record.id} to sheets (operation: ${operation})`,
      );

      const creditApplicationId = record.creditApplicationId;
      const sheetId = record.sheetId;

      this.logger.debug(`Syncing contract details:`, {
        creditApplicationId,
        sheetId,
        dbId: record.id,
        synced: record.synced,
        operation,
      });

      if (!creditApplicationId) {
        throw new Error(
          'Contract details has no Credit Application ID for identification',
        );
      }

      // For ContractDetails, the sheetId is always the actual ID in the sheet
      // Check if record already exists in sheets
      const existingRecord =
        await this.findExistingContractDetailsInSheets(sheetId);
      this.logger.debug(
        `Existing record check result:`,
        existingRecord ? 'Found' : 'Not found',
      );

      this.logger.debug(
        `Operation: ${operation}, Existing record: ${!!existingRecord}`,
      );

      // Use operation parameter to determine action
      if (operation === 'update' && existingRecord) {
        // Update existing record
        this.logger.debug(
          `Updating existing contract details in sheet by sheetId: ${sheetId}`,
        );
        const sheetData =
          this.contractDetailsDbService.convertDbDataToSheet(record);
        await this.sheetsService.updateContractDetails(sheetId, sheetData);
        this.logger.debug(
          `Updated existing contract details in sheet: ${creditApplicationId} (sheetId: ${sheetId})`,
        );
      } else if (operation === 'create' || !existingRecord) {
        // Create new record
        this.logger.debug(`Creating new contract details in Google Sheets`);
        const sheetData =
          this.contractDetailsDbService.convertDbDataToSheet(record);
        const newRecord =
          await this.sheetsService.addContractDetails(sheetData);
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
      await this.contractDetailsDbService.updateSyncStatus(record.id, true);

      this.logger.log(
        `Successfully synced contract details ${record.id} to sheets`,
      );
    } catch (error) {
      this.logger.error(
        `Error syncing contract details ${record.id} to sheets:`,
        error,
      );
      throw error;
    }
  }

  async syncContractDetailsById(id: number, operation?: 'create' | 'update') {
    try {
      this.logger.log(`Syncing contract details by ID: ${id} (${operation})`);

      const record = await this.contractDetailsDbService.findById(
        id.toString(),
      );
      if (!record) {
        throw new Error(`Contract details with ID ${id} not found`);
      }

      await this.syncContractDetailsToSheet(record, operation);

      return {
        success: true,
        message: `Successfully synced contract details ${id} to sheets`,
      };
    } catch (error) {
      this.logger.error(`Error syncing contract details ${id}:`, error);
      throw error;
    }
  }

  async syncByCreditApplicationId(creditApplicationId: string) {
    try {
      this.logger.log(
        `Syncing contract details for credit application: ${creditApplicationId}`,
      );

      const records =
        await this.contractDetailsDbService.findByCreditApplicationId(
          creditApplicationId,
        );
      this.logger.log(
        `Found ${records.length} records for credit application ${creditApplicationId}`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          await this.syncContractDetailsToSheet(record);
          successCount++;
        } catch (error) {
          this.logger.error(`Error syncing record ${record.id}:`, error);
          errorCount++;
        }
      }

      return {
        success: true,
        message: `Synced ${successCount} contract details for credit application ${creditApplicationId}`,
        data: { successCount, errorCount, totalRecords: records.length },
      };
    } catch (error) {
      this.logger.error(
        `Error syncing contract details for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  private async findExistingContractDetailsInSheets(identifier: string) {
    try {
      if (!identifier) {
        this.logger.debug('No identifier provided for search');
        return null;
      }

      const records = await this.sheetsService.getContractDetails();
      this.logger.debug(`Found ${records.length} records in sheets`);
      this.logger.debug(`Looking for identifier: ${identifier}`);

      // For ContractDetails, the identifier is always the sheetId
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
      this.logger.error(
        `Error finding existing contract details in sheets:`,
        error,
      );
      return null;
    }
  }
}
