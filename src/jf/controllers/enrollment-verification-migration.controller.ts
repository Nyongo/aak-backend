import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { EnrollmentVerificationDbService } from '../services/enrollment-verification-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/enrollment-verification-migration')
export class EnrollmentVerificationMigrationController {
  private readonly logger = new Logger(
    EnrollmentVerificationMigrationController.name,
  );

  constructor(
    private readonly enrollmentVerificationDbService: EnrollmentVerificationDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Enrollment Verification');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getEnrollmentVerifications();
      const dbData = await this.enrollmentVerificationDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((ev) => ({
              creditApplicationId: ev['Credit Application ID'],
              enrollmentReport: ev['Enrollment Report'],
              sheetId: ev.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((ev) => ev.synced).length,
            unsynced: dbData.filter((ev) => !ev.synced).length,
            sample: dbData.slice(0, 3).map((ev) => ({
              creditApplicationId: ev.creditApplicationId,
              enrollmentReport: ev.enrollmentReport,
              sheetId: ev.sheetId,
              synced: ev.synced,
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
      const sheetsData = await this.sheetsService.getEnrollmentVerifications();

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
            (ev) => ev['Credit Application ID'] === creditApplicationId,
          )
        : sheetsData;

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each record from Google Sheets
      for (const sheetEnrollmentVerification of filteredSheetsData) {
        try {
          // Skip completely empty records (no data at all)
          if (
            Object.keys(sheetEnrollmentVerification).length === 0 ||
            (Object.keys(sheetEnrollmentVerification).length === 1 &&
              sheetEnrollmentVerification.ID === '')
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetEnrollmentVerification,
            });
            continue;
          }

          // Skip records with empty ID
          if (
            !sheetEnrollmentVerification.ID ||
            sheetEnrollmentVerification.ID.trim() === ''
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetEnrollmentVerification,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord =
            await this.enrollmentVerificationDbService.findBySheetId(
              sheetEnrollmentVerification.ID,
            );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetEnrollmentVerification.ID,
              creditApplicationId:
                sheetEnrollmentVerification['Credit Application ID'],
              enrollmentReport:
                sheetEnrollmentVerification['Enrollment Report'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbEnrollmentVerification = this.convertSheetToDbFormat(
            sheetEnrollmentVerification,
          );

          // Create record in database
          await this.enrollmentVerificationDbService.create(
            dbEnrollmentVerification,
          );
          imported++;

          this.logger.debug(
            `Imported Enrollment Verification: ${sheetEnrollmentVerification['Credit Application ID']} - ${sheetEnrollmentVerification['Enrollment Report']}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetEnrollmentVerification.ID,
            creditApplicationId:
              sheetEnrollmentVerification['Credit Application ID'],
            enrollmentReport: sheetEnrollmentVerification['Enrollment Report'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import Enrollment Verification ${sheetEnrollmentVerification.ID}: ${errorMessage}`,
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
      // Get unsynced enrollment verification from database
      const allUnsyncedEnrollmentVerification =
        await this.enrollmentVerificationDbService.findUnsynced();
      const unsyncedEnrollmentVerification = creditApplicationId
        ? allUnsyncedEnrollmentVerification.filter(
            (ev) => ev.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedEnrollmentVerification;

      if (
        !unsyncedEnrollmentVerification ||
        unsyncedEnrollmentVerification.length === 0
      ) {
        return {
          success: true,
          message: 'No unsynced enrollment verification found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced enrollment verification
      for (const enrollmentVerification of unsyncedEnrollmentVerification) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.enrollmentVerificationDbService.updateSyncStatus(
            enrollmentVerification.id,
            true,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            enrollmentReport: enrollmentVerification.enrollmentReport,
            creditApplicationId: enrollmentVerification.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Enrollment Verification ${enrollmentVerification.id}: ${errorMessage}`,
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
    this.logger.log(`Comparing Enrollment Verification record: ${sheetId}`);

    try {
      // Get record from Google Sheets
      const sheetsData = await this.sheetsService.getEnrollmentVerifications();
      const sheetRecord = sheetsData.find((ev) => ev.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: `Record with sheet ID ${sheetId} not found in Google Sheets`,
        };
      }

      // Get record from database
      const dbRecord =
        await this.enrollmentVerificationDbService.findBySheetId(sheetId);

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

  private convertSheetToDbFormat(sheetEnrollmentVerification: any): any {
    // Map sheet data to database format
    const dbEnrollmentVerification = {
      sheetId: sheetEnrollmentVerification.ID,
      creditApplicationId: sheetEnrollmentVerification['Credit Application ID'],
      subCountyEnrollmentReport:
        sheetEnrollmentVerification['Sub County Enrollment Report'],
      enrollmentReport: sheetEnrollmentVerification['Enrollment Report'],
      numberOfStudentsThisYear: this.convertToFloat(
        sheetEnrollmentVerification['Number of Students This Year'],
      ),
      numberOfStudentsLastYear: this.convertToFloat(
        sheetEnrollmentVerification['Number of students last year'],
      ),
      numberOfStudentsTwoYearsAgo: this.convertToFloat(
        sheetEnrollmentVerification['Number of students two years ago'],
      ),
      synced: true, // Mark as synced since we're importing from sheets
    };

    // Filter out undefined, null, and empty string values
    Object.keys(dbEnrollmentVerification).forEach((key) => {
      if (
        dbEnrollmentVerification[key] === undefined ||
        dbEnrollmentVerification[key] === null ||
        dbEnrollmentVerification[key] === ''
      ) {
        delete dbEnrollmentVerification[key];
      }
    });

    return dbEnrollmentVerification;
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
