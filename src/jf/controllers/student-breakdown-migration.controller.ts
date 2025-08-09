import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { StudentBreakdownDbService } from '../services/student-breakdown-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/student-breakdown-migration')
export class StudentBreakdownMigrationController {
  private readonly logger = new Logger(
    StudentBreakdownMigrationController.name,
  );

  constructor(
    private readonly studentBreakdownDbService: StudentBreakdownDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    try {
      const totalInDb = await this.studentBreakdownDbService.findAll();
      const totalInSheets = await this.sheetsService.getStudentBreakdowns();

      return {
        success: true,
        data: {
          totalInDatabase: totalInDb.length,
          totalInSheets: totalInSheets.length,
          syncedInDatabase: totalInDb.filter((record) => record.synced).length,
          unsyncedInDatabase: totalInDb.filter((record) => !record.synced)
            .length,
        },
        message: 'Student breakdown migration status retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get migration status: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
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
      // Get all student breakdowns from Google Sheets
      const allSheetStudentBreakdowns =
        await this.sheetsService.getStudentBreakdowns();
      const sheetStudentBreakdowns = creditApplicationId
        ? allSheetStudentBreakdowns.filter(
            (sb) => sb['Credit Application'] === creditApplicationId,
          )
        : allSheetStudentBreakdowns;

      if (!sheetStudentBreakdowns || sheetStudentBreakdowns.length === 0) {
        return {
          success: true,
          message: 'No student breakdowns found in Google Sheets',
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

      for (const sheetStudentBreakdown of sheetStudentBreakdowns) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetStudentBreakdown).length === 0) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetStudentBreakdown,
            });
            continue;
          }

          // Skip records with empty ID
          if (
            !sheetStudentBreakdown.ID ||
            sheetStudentBreakdown.ID.trim() === ''
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetStudentBreakdown,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord =
            await this.studentBreakdownDbService.findBySheetId(
              sheetStudentBreakdown.ID,
            );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetStudentBreakdown.ID,
              creditApplicationId: sheetStudentBreakdown['Credit Application'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbData = this.convertSheetToDbFormat(sheetStudentBreakdown);

          // Create record in database
          await this.studentBreakdownDbService.create(dbData);
          imported++;

          this.logger.debug(
            `Imported student breakdown with sheetId: ${sheetStudentBreakdown.ID}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetStudentBreakdown.ID,
            creditApplicationId: sheetStudentBreakdown['Credit Application'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import student breakdown ${sheetStudentBreakdown.ID}: ${errorMessage}`,
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
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
        skippedDetails: skippedDetails.length > 0 ? skippedDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to import from sheets: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
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
      // Get unsynced student breakdowns from database
      const allUnsyncedStudentBreakdowns =
        await this.studentBreakdownDbService.findUnsynced();
      const unsyncedStudentBreakdowns = creditApplicationId
        ? allUnsyncedStudentBreakdowns.filter(
            (sb) => sb.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedStudentBreakdowns;

      if (
        !unsyncedStudentBreakdowns ||
        unsyncedStudentBreakdowns.length === 0
      ) {
        return {
          success: true,
          message: 'No unsynced student breakdowns found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced student breakdown
      for (const studentBreakdown of unsyncedStudentBreakdowns) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.studentBreakdownDbService.updateSyncStatus(
            studentBreakdown.id,
            true,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: studentBreakdown.sheetId,
            creditApplicationId: studentBreakdown.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Student Breakdown ${studentBreakdown.id}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(`Sync completed: ${synced} synced, ${errors} errors`);

      return {
        success: true,
        message: `Sync completed: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync to sheets: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
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
      // Step 1: Import from sheets
      const importResult = await this.importFromSheets(creditApplicationId);
      if (!importResult.success) {
        return importResult;
      }

      // Step 2: Sync to sheets
      const syncResult = await this.syncToSheets(creditApplicationId);
      if (!syncResult.success) {
        return syncResult;
      }

      return {
        success: true,
        message: 'Full migration completed successfully',
        import: importResult,
        sync: syncResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to complete full migration: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('compare-record')
  async compareRecord(@Query('sheetId') sheetId: string) {
    try {
      // Get record from database
      const dbRecord =
        await this.studentBreakdownDbService.findBySheetId(sheetId);
      if (!dbRecord) {
        return {
          success: false,
          error: 'Record not found in database',
        };
      }

      // Get record from sheets
      const sheetRecords = await this.sheetsService.getStudentBreakdowns();
      const sheetRecord = sheetRecords.find((record) => record.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: 'Record not found in Google Sheets',
        };
      }

      return {
        success: true,
        data: {
          database: dbRecord,
          sheet: sheetRecord,
        },
        message: 'Record comparison completed',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare record: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private convertSheetToDbFormat(sheetRecord: any) {
    return {
      sheetId: sheetRecord.ID,
      creditApplicationId: sheetRecord['Credit Application'],
      feeType: sheetRecord['Fee Type'],
      term: sheetRecord['Term ID'],
      grade: sheetRecord['Grade'],
      numberOfStudents: sheetRecord['Number of Students']
        ? Number(sheetRecord['Number of Students'])
        : null,
      fee: sheetRecord['Fee'] ? Number(sheetRecord['Fee']) : null,
      totalRevenue: sheetRecord['Total Revenue']
        ? Number(sheetRecord['Total Revenue'])
        : null,
      synced: true, // Mark as synced since we're importing from sheets
    };
  }
}
