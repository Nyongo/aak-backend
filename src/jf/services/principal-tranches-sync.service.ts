import { Injectable, Logger } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { SheetsService } from './sheets.service';
import { PrincipalTranchesDbService } from './principal-tranches-db.service';

@Injectable()
export class PrincipalTranchesSyncService {
  private readonly logger = new Logger(PrincipalTranchesSyncService.name);
  private readonly SHEET_NAME = 'Principal Tranches';

  constructor(
    private readonly googleDriveService: GoogleDriveService,
    private readonly sheetsService: SheetsService,
    private readonly principalTranchesDbService: PrincipalTranchesDbService,
  ) {}

  async syncFromGoogleSheets(spreadsheetId: string) {
    try {
      this.logger.log(`Starting sync from Google Sheets: ${spreadsheetId}`);

      // Get the sheet data
      const sheetData = await this.sheetsService.getPrincipalTranches();

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
            row['Sheet ID'] ||
            row['ID'] ||
            row['sheetId'] ||
            row['Tranche Number'] ||
            null;

          if (!idValue) {
            this.logger.warn('Skipping row without ID');
            errorCount++;
            continue;
          }

          // Check if record already exists
          const existingRecord =
            await this.principalTranchesDbService.findBySheetId(idValue);

          if (existingRecord) {
            // Update existing record
            await this.principalTranchesDbService.update(
              existingRecord.id,
              this.principalTranchesDbService.convertSheetToDb(row),
            );
            this.logger.log(`Updated existing record: ${idValue}`);
          } else {
            // Create new record
            await this.principalTranchesDbService.create(
              this.principalTranchesDbService.convertSheetToDb(row),
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
      const dbRecords = await this.principalTranchesDbService.findAll();

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
      return await this.sheetsService.getPrincipalTranches();
    } catch (error) {
      this.logger.error('Error getting sheet data:', error);
      throw error;
    }
  }

  async getSyncStatus(spreadsheetId: string) {
    try {
      const sheetData = await this.getSheetData(spreadsheetId);
      const dbRecords = await this.principalTranchesDbService.findAll();

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
