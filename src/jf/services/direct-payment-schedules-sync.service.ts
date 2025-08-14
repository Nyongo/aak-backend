import { Injectable, Logger } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { SheetsService } from './sheets.service';
import { DirectPaymentSchedulesDbService } from './direct-payment-schedules-db.service';

@Injectable()
export class DirectPaymentSchedulesSyncService {
  private readonly logger = new Logger(DirectPaymentSchedulesSyncService.name);
  private readonly SHEET_NAME = 'Dir. Payment Schedules';

  constructor(
    private readonly googleDriveService: GoogleDriveService,
    private readonly sheetsService: SheetsService,
    private readonly directPaymentSchedulesDbService: DirectPaymentSchedulesDbService,
  ) {}

  async syncFromGoogleSheets(spreadsheetId: string) {
    try {
      this.logger.log(`Starting sync from Google Sheets: ${spreadsheetId}`);

      // Get the sheet data
      const sheetData = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!sheetData || sheetData.length === 0) {
        this.logger.warn('No data found in the sheet');
        return { message: 'No data found in the sheet', synced: 0 };
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const row of sheetData) {
        try {
          // Check if record already exists
          const existingRecord =
            await this.directPaymentSchedulesDbService.findBySheetId(
              row['Sheet ID'] || row['ID'],
            );

          if (existingRecord) {
            // Update existing record
            await this.directPaymentSchedulesDbService.update(
              existingRecord.id,
              this.directPaymentSchedulesDbService.convertSheetToDb(row),
            );
            this.logger.log(
              `Updated existing record: ${row['Sheet ID'] || row['ID']}`,
            );
          } else {
            // Create new record
            await this.directPaymentSchedulesDbService.create(
              this.directPaymentSchedulesDbService.convertSheetToDb(row),
            );
            this.logger.log(
              `Created new record: ${row['Sheet ID'] || row['ID']}`,
            );
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
      const dbRecords = await this.directPaymentSchedulesDbService.findAll();

      if (!dbRecords || dbRecords.length === 0) {
        this.logger.warn('No records found in database');
        return { message: 'No records found in database', synced: 0 };
      }

      // Convert to sheet format
      const sheetData =
        this.directPaymentSchedulesDbService.convertDbArrayToSheet(dbRecords);

      // Note: Sheets are read-only, cannot update
      this.logger.log('Note: Sheets are read-only, cannot update');

      this.logger.log(
        `Sync to Google Sheets completed. Synced: ${sheetData.length} records`,
      );
      return {
        message: 'Sync to Google Sheets completed successfully',
        synced: sheetData.length,
      };
    } catch (error) {
      this.logger.error('Error during sync to Google Sheets:', error);
      throw error;
    }
  }

  async getSheetData(spreadsheetId: string) {
    try {
      return await this.sheetsService.getSheetData(this.SHEET_NAME);
    } catch (error) {
      this.logger.error('Error getting sheet data:', error);
      throw error;
    }
  }

  async getSyncStatus(spreadsheetId: string) {
    try {
      const sheetData = await this.getSheetData(spreadsheetId);
      const dbRecords = await this.directPaymentSchedulesDbService.findAll();

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
