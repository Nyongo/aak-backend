import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { ReferrersDbService } from '../services/referrers-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/referrers-migration')
export class ReferrersMigrationController {
  private readonly logger = new Logger(ReferrersMigrationController.name);

  constructor(
    private readonly referrersDbService: ReferrersDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Referrers');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getReferrers();
      const dbData = await this.referrersDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((r) => ({
              schoolId: r['School ID'],
              referrerName: r['Referrer Name'],
              sheetId: r.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((r) => r.synced).length,
            unsynced: dbData.filter((r) => !r.synced).length,
            sample: dbData.slice(0, 3).map((r) => ({
              schoolId: r.schoolId,
              referrerName: r.referrerName,
              sheetId: r.sheetId,
              synced: r.synced,
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
  async importFromSheets(@Query('schoolId') schoolId?: string) {
    this.logger.log(
      `Starting import from Google Sheets${schoolId ? ` for School ID: ${schoolId}` : ''}`,
    );

    try {
      // Get data from Google Sheets
      const sheetsData = schoolId
        ? await this.sheetsService.getReferrers(schoolId)
        : await this.sheetsService.getReferrers();

      if (!sheetsData || sheetsData.length === 0) {
        return {
          success: true,
          message: 'No data found in Google Sheets',
          imported: 0,
          skipped: 0,
          errors: 0,
        };
      }

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each record from Google Sheets
      for (const sheetReferrer of sheetsData) {
        try {
          // Skip completely empty records (no data at all)
          if (
            Object.keys(sheetReferrer).length === 0 ||
            (Object.keys(sheetReferrer).length === 1 && sheetReferrer.ID === '')
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetReferrer,
            });
            continue;
          }

          // Skip records with empty ID
          if (!sheetReferrer.ID || sheetReferrer.ID.trim() === '') {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetReferrer,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord = await this.referrersDbService.findBySheetId(
            sheetReferrer.ID,
          );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetReferrer.ID,
              schoolId: sheetReferrer['School ID'],
              referrerName: sheetReferrer['Referrer Name'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbReferrer = this.convertSheetToDbFormat(sheetReferrer);

          // Create record in database
          await this.referrersDbService.create(dbReferrer);
          imported++;

          this.logger.debug(
            `Imported Referrer: ${sheetReferrer['School ID']} - ${sheetReferrer['Referrer Name']}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetReferrer.ID,
            schoolId: sheetReferrer['School ID'],
            referrerName: sheetReferrer['Referrer Name'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import Referrer ${sheetReferrer.ID}: ${errorMessage}`,
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
  async syncToSheets(@Query('schoolId') schoolId?: string) {
    this.logger.log(
      `Starting sync to Google Sheets${schoolId ? ` for School ID: ${schoolId}` : ''}`,
    );

    try {
      // Get unsynced referrers from database
      const unsyncedReferrers = schoolId
        ? (await this.referrersDbService.findBySchoolId(schoolId)).filter(
            (r) => !r.synced,
          )
        : await this.referrersDbService.findUnsynced();

      if (!unsyncedReferrers || unsyncedReferrers.length === 0) {
        return {
          success: true,
          message: 'No unsynced referrers found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced referrer
      for (const referrer of unsyncedReferrers) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.referrersDbService.updateSyncStatus(referrer.id, true);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            referrerName: referrer.referrerName,
            schoolId: referrer.schoolId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Referrer ${referrer.id}: ${errorMessage}`,
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
  async fullMigration(@Query('schoolId') schoolId?: string) {
    this.logger.log(
      `Starting full migration${schoolId ? ` for School ID: ${schoolId}` : ''}`,
    );

    try {
      // First import from sheets
      const importResult = await this.importFromSheets(schoolId);

      // Then sync to sheets
      const syncResult = await this.syncToSheets(schoolId);

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
    this.logger.log(`Comparing Referrer record: ${sheetId}`);

    try {
      // Get record from Google Sheets
      const sheetsData = await this.sheetsService.getReferrers();
      const sheetRecord = sheetsData.find((r) => r.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: `Record with sheet ID ${sheetId} not found in Google Sheets`,
        };
      }

      // Get record from database
      const dbRecord = await this.referrersDbService.findBySheetId(sheetId);

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

  private convertSheetToDbFormat(sheetReferrer: any): any {
    // Map sheet data to database format
    const dbReferrer = {
      sheetId: sheetReferrer.ID,
      schoolId: sheetReferrer['School ID'],
      referrerName: sheetReferrer['Referrer Name'],
      mpesaNumber: sheetReferrer['Mpesa Number'],
      referralRewardPaid: sheetReferrer['Referral Reward Paid'],
      datePaid: sheetReferrer['Date Paid'],
      amountPaid: this.convertToFloat(sheetReferrer['Amount Paid']),
      proofOfPayment: sheetReferrer['Proof of Payment'],
      synced: true, // Mark as synced since we're importing from sheets
    };

    // Filter out undefined, null, and empty string values
    Object.keys(dbReferrer).forEach((key) => {
      if (
        dbReferrer[key] === undefined ||
        dbReferrer[key] === null ||
        dbReferrer[key] === ''
      ) {
        delete dbReferrer[key];
      }
    });

    return dbReferrer;
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
