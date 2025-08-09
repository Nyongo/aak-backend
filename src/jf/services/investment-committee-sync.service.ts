import { Injectable, Logger } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { InvestmentCommitteeDbService } from './investment-committee-db.service';

@Injectable()
export class InvestmentCommitteeSyncService {
  private readonly logger = new Logger(InvestmentCommitteeSyncService.name);
  private readonly SHEET_NAME = 'Investment Committee';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly investmentCommitteeDbService: InvestmentCommitteeDbService,
  ) {}

  async syncAllToSheets() {
    try {
      this.logger.log(
        'Starting sync of all investment committee records to Google Sheets',
      );

      const unsyncedRecords =
        await this.investmentCommitteeDbService.findUnsynced();
      this.logger.log(
        `Found ${unsyncedRecords.length} unsynced investment committee records`,
      );

      for (const record of unsyncedRecords) {
        try {
          await this.syncInvestmentCommitteeToSheet(record);
          this.logger.log(
            `Successfully synced investment committee record ${record.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to sync investment committee record ${record.id}:`,
            error,
          );
        }
      }

      return {
        success: true,
        message: `Synced ${unsyncedRecords.length} investment committee records to Google Sheets`,
        syncedCount: unsyncedRecords.length,
      };
    } catch (error) {
      this.logger.error(
        'Error syncing all investment committee records to sheets:',
        error,
      );
      throw error;
    }
  }

  async syncInvestmentCommitteeToSheet(investmentCommittee: any) {
    try {
      this.logger.debug(
        `Syncing investment committee record ${investmentCommittee.id} to sheets`,
      );

      // Convert database record to sheet format
      const sheetData =
        this.investmentCommitteeDbService.convertDbDataToSheet(
          investmentCommittee,
        );

      this.logger.debug(
        `Converted database data to sheet format: ${JSON.stringify(sheetData, null, 2)}`,
      );

      // Add required fields for Google Sheets
      const rowData = {
        ID:
          investmentCommittee.sheetId ||
          `IC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ...sheetData,
        'Created At':
          investmentCommittee.createdAt?.toISOString() ||
          new Date().toISOString(),
      };

      this.logger.debug(
        `Final row data for sheets: ${JSON.stringify(rowData, null, 2)}`,
      );

      // Check if record already exists in sheets
      const hasTemporarySheetId =
        investmentCommittee.sheetId?.startsWith('IC-');
      this.logger.debug(`Has temporary sheetId: ${hasTemporarySheetId}`);
      this.logger.debug(`SheetId: ${investmentCommittee.sheetId}`);
      this.logger.debug(
        `Credit Application ID: ${investmentCommittee.creditApplicationId}`,
      );

      // For records with temporary sheetId, always create new records
      // For records with real sheetId, look for existing records to update
      let existingRecord = null;
      if (!hasTemporarySheetId) {
        existingRecord = await this.findExistingInvestmentCommitteeInSheets(
          investmentCommittee.creditApplicationId,
        );
      }

      this.logger.debug(
        `Existing record found: ${existingRecord ? 'Yes' : 'No'}`,
      );

      if (existingRecord && existingRecord.ID) {
        // Update existing record
        this.logger.debug(
          `Updating existing investment committee record in sheets: ${existingRecord.ID}`,
        );
        await this.sheetsService.updateInvestmentCommittee(
          existingRecord.ID,
          rowData,
        );

        // Update the database record with the real sheetId and mark as synced
        await this.investmentCommitteeDbService.updateSyncStatus(
          investmentCommittee.id,
          true,
        );
        await this.investmentCommitteeDbService.update(existingRecord.ID, {
          sheetId: existingRecord.ID,
        });

        this.logger.debug(
          `Successfully updated investment committee record ${investmentCommittee.id} in sheets`,
        );
      } else {
        // Create new record
        this.logger.debug(`Creating new investment committee record in sheets`);
        this.logger.debug(
          `Row data being sent to sheets: ${JSON.stringify(rowData, null, 2)}`,
        );

        const newRecord =
          await this.sheetsService.addInvestmentCommittee(rowData);

        this.logger.debug(
          `New record returned from sheets: ${JSON.stringify(newRecord, null, 2)}`,
        );

        // Update the database record with the real sheetId and mark as synced
        await this.investmentCommitteeDbService.updateSyncStatus(
          investmentCommittee.id,
          true,
        );

        if (newRecord && newRecord.ID) {
          await this.investmentCommitteeDbService.update(
            investmentCommittee.sheetId || rowData.ID,
            {
              sheetId: newRecord.ID,
            },
          );
          this.logger.debug(
            `Updated database record with sheetId: ${newRecord.ID}`,
          );

          // Sync calculated values back from Google Sheets to Postgres
          await this.syncCalculatedValuesFromSheets(
            newRecord.ID,
            investmentCommittee.id,
          );
        } else {
          this.logger.warn(
            `No valid newRecord returned from sheets, keeping temporary sheetId: ${investmentCommittee.sheetId}`,
          );
        }

        this.logger.debug(
          `Successfully created investment committee record ${investmentCommittee.id} in sheets`,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error syncing investment committee record ${investmentCommittee.id} to sheets:`,
        error,
      );
      this.logger.error(
        `Investment committee data: ${JSON.stringify(investmentCommittee, null, 2)}`,
      );
      throw error;
    }
  }

  async syncInvestmentCommitteeById(
    id: number,
    operation?: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Syncing investment committee record ${id} to sheets (operation: ${operation})`,
      );

      const investmentCommittee =
        await this.investmentCommitteeDbService.findById(id.toString());
      if (!investmentCommittee) {
        throw new Error(`Investment committee record ${id} not found`);
      }

      await this.syncInvestmentCommitteeToSheet(investmentCommittee);

      return {
        success: true,
        message: `Successfully synced investment committee record ${id} to Google Sheets`,
      };
    } catch (error) {
      this.logger.error(
        `Error syncing investment committee record ${id} to sheets:`,
        error,
      );
      throw error;
    }
  }

  async syncByCreditApplicationId(creditApplicationId: string) {
    try {
      this.logger.log(
        `Syncing investment committee records for credit application ${creditApplicationId} to sheets`,
      );

      const records =
        await this.investmentCommitteeDbService.findByCreditApplicationId(
          creditApplicationId,
        );
      this.logger.log(
        `Found ${records.length} investment committee records for credit application ${creditApplicationId}`,
      );

      for (const record of records) {
        try {
          await this.syncInvestmentCommitteeToSheet(record);
          this.logger.log(
            `Successfully synced investment committee record ${record.id} for credit application ${creditApplicationId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to sync investment committee record ${record.id} for credit application ${creditApplicationId}:`,
            error,
          );
        }
      }

      return {
        success: true,
        message: `Synced ${records.length} investment committee records for credit application ${creditApplicationId} to Google Sheets`,
        syncedCount: records.length,
      };
    } catch (error) {
      this.logger.error(
        `Error syncing investment committee records for credit application ${creditApplicationId} to sheets:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Sync calculated values from Google Sheets back to Postgres database
   * This method fetches the record from sheets and updates the database with calculated values
   */
  async syncCalculatedValuesFromSheets(
    sheetId: string,
    dbId: number,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Syncing calculated values from sheets for record ${sheetId} to database record ${dbId}`,
      );

      // Wait a moment for the sheet to update with calculated values
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fetch the record from Google Sheets
      const investmentCommittees =
        await this.sheetsService.getInvestmentCommittees();
      const sheetRecord = investmentCommittees.find(
        (record) => record.ID === sheetId,
      );

      if (!sheetRecord) {
        this.logger.warn(
          `Could not find record with sheetId ${sheetId} in Google Sheets`,
        );
        return;
      }

      this.logger.debug(
        `Found sheet record: ${JSON.stringify(sheetRecord, null, 2)}`,
      );

      // Convert sheet data back to database format
      const calculatedData =
        this.investmentCommitteeDbService.convertSheetDataToDb(sheetRecord);

      this.logger.debug(
        `Converted calculated data: ${JSON.stringify(calculatedData, null, 2)}`,
      );

      // Update the database record with calculated values
      await this.investmentCommitteeDbService.updateById(dbId, calculatedData);

      this.logger.debug(
        `Successfully synced calculated values from sheets to database record ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error syncing calculated values from sheets for record ${sheetId}:`,
        error,
      );
      // Don't throw error to avoid breaking the main sync process
    }
  }

  /**
   * Find existing investment committee record in Google Sheets by creditApplicationId
   * This method is used when we have a synced record with a temporary sheetId
   * and need to find the real Google Sheets record to update it
   */
  private async findExistingInvestmentCommitteeInSheets(
    creditApplicationId: string,
  ): Promise<any> {
    try {
      const investmentCommittees =
        await this.sheetsService.getInvestmentCommittees();

      // Log all investment committees for debugging
      this.logger.debug(
        `Searching through ${investmentCommittees.length} investment committees in sheets for creditApplicationId: ${creditApplicationId}`,
      );

      // Log the first few records to see the structure
      if (investmentCommittees.length > 0) {
        this.logger.debug(
          `Sample investment committee record structure: ${JSON.stringify(investmentCommittees[0], null, 2)}`,
        );
      }

      // Find the exact record by creditApplicationId
      const existingRecord = investmentCommittees.find(
        (investmentCommittee) =>
          investmentCommittee['Credit Application ID'] === creditApplicationId,
      );

      if (existingRecord) {
        this.logger.debug(
          `Found existing investment committee in sheets with ID: ${existingRecord.ID}`,
        );
        return existingRecord;
      }

      this.logger.debug(
        `No existing investment committee found in sheets for creditApplicationId: ${creditApplicationId}`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error finding existing investment committee:`, error);
      return null;
    }
  }
}
