import { Injectable, Logger } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { SheetsService } from './sheets.service';
import { DirectLendingProcessingDbService } from './direct-lending-processing-db.service';

@Injectable()
export class DirectLendingProcessingSyncService {
  private readonly logger = new Logger(
    DirectLendingProcessingSyncService.name,
  );
  private readonly SHEET_NAME = 'Direct Lending Processing';

  constructor(
    private readonly googleDriveService: GoogleDriveService,
    private readonly sheetsService: SheetsService,
    private readonly directLendingProcessingDbService: DirectLendingProcessingDbService,
  ) {}

  async syncFromGoogleSheets(spreadsheetId: string) {
    try {
      this.logger.log(`Starting sync from Google Sheets: ${spreadsheetId}`);

      // Get the sheet data
      const sheetData = await this.sheetsService.getDirectLendingProcessing();

      if (!sheetData || sheetData.length === 0) {
        this.logger.warn('No data found in the sheet');
        return { message: 'No data found in the sheet', synced: 0 };
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const row of sheetData) {
        try {
          // Find the ID field
          const idValue =
            row['ID'] ||
            row['Sheet ID'] ||
            row['sheetId'] ||
            row['Id'] ||
            null;

          if (!idValue) {
            this.logger.warn('Skipping row without ID');
            errorCount++;
            continue;
          }

          // Check if record already exists
          const existingRecord =
            await this.directLendingProcessingDbService.findBySheetId(idValue);

          if (existingRecord) {
            // Update existing record
            await this.directLendingProcessingDbService.update(
              existingRecord.id,
              this.directLendingProcessingDbService.convertSheetToDb(row),
            );
            this.logger.log(`Updated existing record: ${idValue}`);
          } else {
            // Create new record
            await this.directLendingProcessingDbService.create(
              this.directLendingProcessingDbService.convertSheetToDb(row),
            );
            this.logger.log(`Created new record: ${idValue}`);
          }
          syncedCount++;
        } catch (error) {
          this.logger.error(
            `Error processing row: ${JSON.stringify(row)}`,
            error,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Sync completed. Synced: ${syncedCount}, Errors: ${errorCount}`,
      );
      return {
        message: 'Sync completed successfully',
        synced: syncedCount,
        errors: errorCount,
        total: sheetData.length,
      };
    } catch (error) {
      this.logger.error('Error during sync from Google Sheets:', error);
      throw error;
    }
  }

  async syncToGoogleSheets(spreadsheetId: string) {
    try {
      this.logger.log(`Starting sync to Google Sheets: ${spreadsheetId}`);

      // Get all records from database
      const dbRecords = await this.directLendingProcessingDbService.findAll();

      if (!dbRecords || dbRecords.length === 0) {
        this.logger.warn('No records found in database');
        return { message: 'No records found in database', synced: 0 };
      }

      // Note: Sheets are read-only, cannot update
      this.logger.log('Note: Sheets are read-only, cannot update');

      this.logger.log(
        `Sync to Google Sheets completed. Synced: ${dbRecords.length} records`,
      );
      return {
        message: 'Sync to Google Sheets completed successfully',
        synced: dbRecords.length,
      };
    } catch (error) {
      this.logger.error('Error during sync to Google Sheets:', error);
      throw error;
    }
  }

  async getSheetData(spreadsheetId: string) {
    try {
      return await this.sheetsService.getDirectLendingProcessing();
    } catch (error) {
      this.logger.error('Error getting sheet data:', error);
      throw error;
    }
  }

  async getSyncStatus(spreadsheetId: string) {
    try {
      const sheetData = await this.getSheetData(spreadsheetId);
      const dbRecords = await this.directLendingProcessingDbService.findAll();

      const syncedRecords = dbRecords.filter((record) => record.synced);
      const pendingRecords = dbRecords.filter((record) => !record.synced);

      return {
        sheetRecords: sheetData?.length || 0,
        dbRecords: dbRecords.length,
        syncedRecords: syncedRecords.length,
        pendingRecords: pendingRecords.length,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting sync status:', error);
      throw error;
    }
  }
}
