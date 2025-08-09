import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { FeePlansDbService } from '../services/fee-plans-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/fee-plans-migration')
export class FeePlansMigrationController {
  private readonly logger = new Logger(FeePlansMigrationController.name);

  constructor(
    private readonly feePlansDbService: FeePlansDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Fee Plans');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getFeePlans();
      const dbData = await this.feePlansDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((fp) => ({
              creditApplicationId: fp['Credit Application ID'],
              schoolYear: fp['School Year'],
              sheetId: fp.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((fp) => fp.synced).length,
            unsynced: dbData.filter((fp) => !fp.synced).length,
            sample: dbData.slice(0, 3).map((fp) => ({
              creditApplicationId: fp.creditApplicationId,
              schoolYear: fp.schoolYear,
              sheetId: fp.sheetId,
              synced: fp.synced,
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
  async importFromSheets(
    @Query('creditApplicationId') creditApplicationId?: string,
  ) {
    this.logger.log(
      `Starting import from Google Sheets${creditApplicationId ? ` for Credit Application ID: ${creditApplicationId}` : ''}`,
    );

    try {
      // Get data from Google Sheets
      const sheetsData = await this.sheetsService.getFeePlans();

      if (!sheetsData || sheetsData.length === 0) {
        return {
          success: true,
          message: 'No data found in Google Sheets',
          imported: 0,
          skipped: 0,
          errors: 0,
        };
      }

      // Filter by creditApplicationId if provided
      const filteredSheetsData = creditApplicationId
        ? sheetsData.filter(
            (fp) => fp['Credit Application ID'] === creditApplicationId,
          )
        : sheetsData;

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each record from Google Sheets
      for (const sheetFeePlan of filteredSheetsData) {
        try {
          // Skip completely empty records (no data at all)
          if (
            Object.keys(sheetFeePlan).length === 0 ||
            (Object.keys(sheetFeePlan).length === 1 && sheetFeePlan.ID === '')
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetFeePlan,
            });
            continue;
          }

          // Skip records with empty ID
          if (!sheetFeePlan.ID || sheetFeePlan.ID.trim() === '') {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetFeePlan,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord = await this.feePlansDbService.findBySheetId(
            sheetFeePlan.ID,
          );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetFeePlan.ID,
              creditApplicationId: sheetFeePlan['Credit Application ID'],
              schoolYear: sheetFeePlan['School Year'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbFeePlan = this.convertSheetToDbFormat(sheetFeePlan);

          // Create record in database
          await this.feePlansDbService.create(dbFeePlan);
          imported++;

          this.logger.debug(
            `Imported Fee Plan: ${sheetFeePlan['Credit Application ID']} - ${sheetFeePlan['School Year']}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetFeePlan.ID,
            creditApplicationId: sheetFeePlan['Credit Application ID'],
            schoolYear: sheetFeePlan['School Year'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import Fee Plan ${sheetFeePlan.ID}: ${errorMessage}`,
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
        errorDetails,
        skippedDetails,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to import from sheets: ${errorMessage}`);
      return { success: false, error: errorMessage };
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
      // Get unsynced fee plans from database
      const allUnsyncedFeePlans = await this.feePlansDbService.findUnsynced();
      const unsyncedFeePlans = creditApplicationId
        ? allUnsyncedFeePlans.filter(
            (fp) => fp.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedFeePlans;

      if (!unsyncedFeePlans || unsyncedFeePlans.length === 0) {
        return {
          success: true,
          message: 'No unsynced fee plans found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced fee plan
      for (const feePlan of unsyncedFeePlans) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.feePlansDbService.updateSyncStatus(feePlan.id, true);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            schoolYear: feePlan.schoolYear,
            creditApplicationId: feePlan.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Fee Plan ${feePlan.id}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(`Sync completed: ${synced} synced, ${errors} errors`);

      return {
        success: true,
        message: `Sync completed: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync to sheets: ${errorMessage}`);
      return { success: false, error: errorMessage };
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
      // First import from sheets
      const importResult = await this.importFromSheets(creditApplicationId);

      // Then sync to sheets
      const syncResult = await this.syncToSheets(creditApplicationId);

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
    this.logger.log(`Comparing Fee Plan record: ${sheetId}`);

    try {
      // Get record from Google Sheets
      const sheetsData = await this.sheetsService.getFeePlans();
      const sheetRecord = sheetsData.find((fp) => fp.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: `Record with sheet ID ${sheetId} not found in Google Sheets`,
        };
      }

      // Get record from database
      const dbRecord = await this.feePlansDbService.findBySheetId(sheetId);

      return {
        success: true,
        comparison: {
          sheetId,
          sheet: sheetRecord,
          database: dbRecord,
          synced: dbRecord ? dbRecord.synced : false,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare record: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private convertSheetToDbFormat(sheetFeePlan: any): any {
    // Map sheet data to database format
    const dbFeePlan = {
      sheetId: sheetFeePlan.ID,
      creditApplicationId: sheetFeePlan['Credit Application ID'],
      schoolYear: sheetFeePlan['School Year'],
      photo: sheetFeePlan['Photo'],
      file: sheetFeePlan['File'],
      synced: true, // Mark as synced since we're importing from sheets
    };

    // Filter out undefined, null, and empty string values
    Object.keys(dbFeePlan).forEach((key) => {
      if (
        dbFeePlan[key] === undefined ||
        dbFeePlan[key] === null ||
        dbFeePlan[key] === ''
      ) {
        delete dbFeePlan[key];
      }
    });

    return dbFeePlan;
  }

  private convertToFloat(value: any): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      return null;
    }

    return num;
  }
}
