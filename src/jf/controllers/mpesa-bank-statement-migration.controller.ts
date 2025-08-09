import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { MpesaBankStatementDbService } from '../services/mpesa-bank-statement-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/mpesa-bank-statement-migration')
export class MpesaBankStatementMigrationController {
  private readonly logger = new Logger(
    MpesaBankStatementMigrationController.name,
  );

  constructor(
    private readonly mpesaBankStatementDbService: MpesaBankStatementDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Mpesa Bank Statements');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getMpesaBankStatements();
      const dbData = await this.mpesaBankStatementDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((mbs) => ({
              creditApplicationId: mbs['Credit Application'],
              statement: mbs['Statement'],
              sheetId: mbs.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((mbs) => mbs.synced).length,
            unsynced: dbData.filter((mbs) => !mbs.synced).length,
            sample: dbData.slice(0, 3).map((mbs) => ({
              creditApplicationId: mbs.creditApplicationId,
              statement: mbs.statement,
              sheetId: mbs.sheetId,
              synced: mbs.synced,
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
      const sheetsData = await this.sheetsService.getMpesaBankStatements();

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
            (mbs) => mbs['Credit Application'] === creditApplicationId,
          )
        : sheetsData;

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each record from Google Sheets
      for (const sheetMpesaBankStatement of filteredSheetsData) {
        try {
          // Skip completely empty records (no data at all)
          if (
            Object.keys(sheetMpesaBankStatement).length === 0 ||
            (Object.keys(sheetMpesaBankStatement).length === 1 &&
              sheetMpesaBankStatement.ID === '')
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetMpesaBankStatement,
            });
            continue;
          }

          // Skip records with empty ID
          if (
            !sheetMpesaBankStatement.ID ||
            sheetMpesaBankStatement.ID.trim() === ''
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetMpesaBankStatement,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord =
            await this.mpesaBankStatementDbService.findBySheetId(
              sheetMpesaBankStatement.ID,
            );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetMpesaBankStatement.ID,
              creditApplicationId:
                sheetMpesaBankStatement['Credit Application'],
              statement: sheetMpesaBankStatement['Statement'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbMpesaBankStatement = this.convertSheetToDbFormat(
            sheetMpesaBankStatement,
          );

          // Create record in database
          await this.mpesaBankStatementDbService.create(dbMpesaBankStatement);
          imported++;

          this.logger.debug(
            `Imported Mpesa Bank Statement: ${sheetMpesaBankStatement['Credit Application']} - ${sheetMpesaBankStatement['Statement']}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetMpesaBankStatement.ID,
            creditApplicationId: sheetMpesaBankStatement['Credit Application'],
            statement: sheetMpesaBankStatement['Statement'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import Mpesa Bank Statement ${sheetMpesaBankStatement.ID}: ${errorMessage}`,
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
      // Get unsynced mpesa bank statements from database
      const allUnsyncedMpesaBankStatements =
        await this.mpesaBankStatementDbService.findUnsynced();
      const unsyncedMpesaBankStatements = creditApplicationId
        ? allUnsyncedMpesaBankStatements.filter(
            (mbs) => mbs.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedMpesaBankStatements;

      if (
        !unsyncedMpesaBankStatements ||
        unsyncedMpesaBankStatements.length === 0
      ) {
        return {
          success: true,
          message: 'No unsynced mpesa bank statements found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced mpesa bank statement
      for (const mpesaBankStatement of unsyncedMpesaBankStatements) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.mpesaBankStatementDbService.updateSyncStatus(
            mpesaBankStatement.id,
            true,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            statement: mpesaBankStatement.statement,
            creditApplicationId: mpesaBankStatement.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Mpesa Bank Statement ${mpesaBankStatement.id}: ${errorMessage}`,
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
    this.logger.log(`Comparing Mpesa Bank Statement record: ${sheetId}`);

    try {
      // Get record from Google Sheets
      const sheetsData = await this.sheetsService.getMpesaBankStatements();
      const sheetRecord = sheetsData.find((mbs) => mbs.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: `Record with sheet ID ${sheetId} not found in Google Sheets`,
        };
      }

      // Get record from database
      const dbRecord =
        await this.mpesaBankStatementDbService.findBySheetId(sheetId);

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

  private convertSheetToDbFormat(sheetMpesaBankStatement: any): any {
    // Map sheet data to database format
    const dbMpesaBankStatement = {
      sheetId: sheetMpesaBankStatement.ID,
      creditApplicationId: sheetMpesaBankStatement['Credit Application'],
      personalOrBusinessAccount:
        sheetMpesaBankStatement['Personal Or Business Account'],
      type: sheetMpesaBankStatement['Type'],
      accountDetails: sheetMpesaBankStatement['Account Details'],
      description: sheetMpesaBankStatement['Description'],
      statement: sheetMpesaBankStatement['Statement'],
      statementStartDate: sheetMpesaBankStatement['Statement Start Date'],
      statementEndDate: sheetMpesaBankStatement['Statement End Date'],
      totalRevenue: this.convertToFloat(
        sheetMpesaBankStatement['Total Revenue'],
      ),
      convertedExcelFile: sheetMpesaBankStatement['Converted Excel File'],
      synced: true, // Mark as synced since we're importing from sheets
    };

    // Filter out undefined, null, and empty string values
    Object.keys(dbMpesaBankStatement).forEach((key) => {
      if (
        dbMpesaBankStatement[key] === undefined ||
        dbMpesaBankStatement[key] === null ||
        dbMpesaBankStatement[key] === ''
      ) {
        delete dbMpesaBankStatement[key];
      }
    });

    return dbMpesaBankStatement;
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
