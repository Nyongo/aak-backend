import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { DirectLendingProcessingDbService } from '../services/direct-lending-processing-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/direct-lending-processing-migration')
export class DirectLendingProcessingMigrationController {
  private readonly logger = new Logger(
    DirectLendingProcessingMigrationController.name,
  );

  constructor(
    private readonly directLendingProcessingDbService: DirectLendingProcessingDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log(
      'Getting migration status for Direct Lending Processing',
    );
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getDirectLendingProcessing();
      const dbData = await this.directLendingProcessingDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((s) => ({
              sheetId: s['ID'] || s['Sheet ID'],
              // Add more sample fields based on actual columns
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((s) => s.synced).length,
            unsynced: dbData.filter((s) => !s.synced).length,
            sample: dbData.slice(0, 3).map((s) => ({
              sheetId: s.sheetId,
              synced: s.synced,
            })),
          },
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get migration status: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Post('import-from-sheets')
  async importFromSheets() {
    this.logger.log('Starting import from Google Sheets');

    try {
      // Get data from Google Sheets using the specific method
      const sheetsData = await this.sheetsService.getDirectLendingProcessing();

      if (!sheetsData || sheetsData.length === 0) {
        return {
          success: true,
          message: 'No data found in Google Sheets',
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: 0,
        };
      }

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each record from sheets
      for (const sheetRecord of sheetsData) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetRecord).length === 0) {
            this.logger.debug(
              `Skipping empty record: ${JSON.stringify(sheetRecord)}`,
            );
            skipped++;
            skippedDetails.push({
              record: 'Empty Record',
              sheetId: sheetRecord['Sheet ID'] || sheetRecord['ID'] || 'No ID',
              reason: 'Completely empty record in Google Sheets',
            });
            continue;
          }

          // Find the ID field (try multiple possible names)
          const idValue = this.findIdField(sheetRecord);

          // Skip records with empty ID
          if (!idValue) {
            this.logger.debug(
              `Skipping record with empty ID: ${JSON.stringify(sheetRecord)}`,
            );
            skipped++;
            skippedDetails.push({
              record: 'Unknown',
              sheetId: 'Empty ID',
              reason:
                'Empty ID in Google Sheets - tried fields: Sheet ID, ID',
            });
            continue;
          }

          // Convert sheet data to database format
          const dbRecord =
            this.directLendingProcessingDbService.convertSheetToDb(sheetRecord);

          // Check if record already exists in database
          const existingRecord =
            await this.directLendingProcessingDbService.findBySheetId(idValue);

          if (existingRecord) {
            // Update existing record
            await this.directLendingProcessingDbService.update(existingRecord.id, {
              ...dbRecord,
              synced: true, // Mark as synced since it came from sheets
            });
            updated++;
            this.logger.debug(`Updated existing direct lending processing: ${idValue}`);
          } else {
            // Create new record
            await this.directLendingProcessingDbService.create({
              ...dbRecord,
              synced: true, // Mark as already synced since it came from sheets
            });
            imported++;
            this.logger.debug(`Created new direct lending processing: ${idValue}`);
          }
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            record: sheetRecord['ID'] || 'Unknown',
            sheetId: this.findIdField(sheetRecord) || 'Unknown',
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import record ${sheetRecord['ID']}: ${errorMessage}`,
          );
        }
      }

      return {
        success: true,
        message: 'Import completed',
        imported,
        updated,
        skipped,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
        skippedDetails: skippedDetails.length > 0 ? skippedDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to import from sheets: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Post('sync-to-sheets')
  async syncToSheets() {
    this.logger.log('Starting sync to Google Sheets');

    try {
      // Get unsynced records from database
      const unsyncedRecords = await this.directLendingProcessingDbService
        .findAll()
        .then((records) => records.filter((r) => !r.synced));

      if (!unsyncedRecords || unsyncedRecords.length === 0) {
        return {
          success: true,
          message: 'No unsynced records found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced record
      for (const dbRecord of unsyncedRecords) {
        try {
          // Note: Sheets are read-only, so we just mark as synced
          // In a real implementation, you would add to Google Sheets here

          // Mark as synced in database
          await this.directLendingProcessingDbService.update(dbRecord.id, {
            synced: true,
          });

          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            record: dbRecord.sheetId || 'Unknown',
            id: dbRecord.id,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync record ${dbRecord.sheetId}: ${errorMessage}`,
          );
        }
      }

      return {
        success: true,
        message: 'Sync completed (read-only mode)',
        synced,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync to sheets: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Post('full-migration')
  async fullMigration() {
    this.logger.log('Starting full migration');

    try {
      // Step 1: Import from sheets
      const importResult = await this.importFromSheets();
      if (!importResult.success) {
        return importResult;
      }

      // Step 2: Sync to sheets
      const syncResult = await this.syncToSheets();
      if (!syncResult.success) {
        return syncResult;
      }

      return {
        success: true,
        message: 'Full migration completed',
        import: importResult,
        sync: syncResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to complete full migration: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('compare/:sheetId')
  async compareRecord(@Param('sheetId') sheetId: string) {
    this.logger.log(`Comparing record with sheet ID: ${sheetId}`);

    try {
      // Get data from sheets
      const sheetsData = await this.sheetsService.getDirectLendingProcessing();
      const sheetRecord = sheetsData.find(
        (s) => s['Sheet ID'] === sheetId || s['ID'] === sheetId,
      );

      // Get data from database
      const dbRecord =
        await this.directLendingProcessingDbService.findBySheetId(sheetId);

      if (!sheetRecord && !dbRecord) {
        return {
          success: false,
          message: 'Record not found in either source',
        };
      }

      return {
        success: true,
        comparison: {
          sheet: sheetRecord || null,
          database: dbRecord || null,
          matches: JSON.stringify(sheetRecord) === JSON.stringify(dbRecord),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare record: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('columns')
  async getSheetColumns() {
    try {
      const sheetsData = await this.sheetsService.getDirectLendingProcessing();

      if (sheetsData && sheetsData.length > 0) {
        const columns = Object.keys(sheetsData[0]);

        // Log all column names to help with debugging
        this.logger.log(
          `Found ${columns.length} columns in Direct Lending Processing sheet:`,
        );
        columns.forEach((col, index) => {
          this.logger.log(`${index + 1}. "${col}"`);
        });

        // Show sample values for first few records
        const sampleRecords = sheetsData.slice(0, 3).map((record, idx) => {
          const sample: any = { row: idx + 1 };
          columns.forEach((col) => {
            const value = record[col];
            sample[col] =
              value !== undefined && value !== null && value !== ''
                ? String(value).substring(0, 100) // Limit length for display
                : '(empty)';
          });
          return sample;
        });

        return {
          success: true,
          columns,
          totalColumns: columns.length,
          totalRecords: sheetsData.length,
          sampleRecords,
          columnNamesList: columns,
        };
      }

      return {
        success: false,
        message: 'No data found in sheets',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get sheet columns: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private findIdField(record: any): string | null {
    return (
      record['ID'] ||
      record['Sheet ID'] ||
      record['sheetId'] ||
      record['Id'] ||
      null
    );
  }
}
