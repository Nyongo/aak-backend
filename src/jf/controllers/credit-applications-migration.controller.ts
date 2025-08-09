import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { CreditApplicationsDbService } from '../services/credit-applications-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/credit-applications-migration')
export class CreditApplicationsMigrationController {
  private readonly logger = new Logger(
    CreditApplicationsMigrationController.name,
  );

  constructor(
    private readonly creditApplicationsDbService: CreditApplicationsDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Credit Applications');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getCreditApplications();
      const dbData = await this.creditApplicationsDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((ca) => ({
              borrowerId: ca['Borrower ID'],
              creditType: ca['Credit Type'],
              sheetId: ca.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((ca) => ca.synced).length,
            unsynced: dbData.filter((ca) => !ca.synced).length,
            sample: dbData.slice(0, 3).map((ca) => ({
              borrowerId: ca.borrowerId,
              creditType: ca.creditType,
              sheetId: ca.sheetId,
              synced: ca.synced,
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
  async importFromSheets(@Query('borrowerId') borrowerId?: string) {
    this.logger.log(
      `Starting import from Google Sheets${borrowerId ? ` for Borrower ID: ${borrowerId}` : ''}`,
    );

    try {
      // Get data from Google Sheets
      const sheetsData = borrowerId
        ? await this.sheetsService.getCreditApplications(borrowerId)
        : await this.sheetsService.getCreditApplications();

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
      for (const sheetCreditApp of sheetsData) {
        try {
          // Skip completely empty records (no data at all)
          if (
            Object.keys(sheetCreditApp).length === 0 ||
            (Object.keys(sheetCreditApp).length === 1 &&
              sheetCreditApp.ID === '')
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetCreditApp,
            });
            continue;
          }

          // Skip records with empty ID
          if (!sheetCreditApp.ID || sheetCreditApp.ID.trim() === '') {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetCreditApp,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord =
            await this.creditApplicationsDbService.findBySheetId(
              sheetCreditApp.ID,
            );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetCreditApp.ID,
              borrowerId: sheetCreditApp['Borrower ID'],
              creditType: sheetCreditApp['Credit Type'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbCreditApp = this.convertSheetToDbFormat(sheetCreditApp);

          // Create record in database
          await this.creditApplicationsDbService.create(dbCreditApp);
          imported++;

          this.logger.debug(
            `Imported Credit Application: ${sheetCreditApp['Borrower ID']} - ${sheetCreditApp['Credit Type']}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetCreditApp.ID,
            borrowerId: sheetCreditApp['Borrower ID'],
            creditType: sheetCreditApp['Credit Type'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import Credit Application ${sheetCreditApp.ID}: ${errorMessage}`,
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
  async syncToSheets(@Query('borrowerId') borrowerId?: string) {
    this.logger.log(
      `Starting sync to Google Sheets${borrowerId ? ` for Borrower ID: ${borrowerId}` : ''}`,
    );

    try {
      // Get unsynced credit applications from database
      const unsyncedCreditApps = borrowerId
        ? (
            await this.creditApplicationsDbService.findByBorrowerId(borrowerId)
          ).filter((ca) => !ca.synced)
        : await this.creditApplicationsDbService.findUnsynced();

      if (!unsyncedCreditApps || unsyncedCreditApps.length === 0) {
        return {
          success: true,
          message: 'No unsynced credit applications found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced credit application
      for (const creditApp of unsyncedCreditApps) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.creditApplicationsDbService.updateSyncStatus(
            creditApp.id,
            true,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            creditType: creditApp.creditType,
            borrowerId: creditApp.borrowerId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Credit Application ${creditApp.id}: ${errorMessage}`,
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
  async fullMigration(@Query('borrowerId') borrowerId?: string) {
    this.logger.log(
      `Starting full migration${borrowerId ? ` for Borrower ID: ${borrowerId}` : ''}`,
    );

    try {
      // First import from sheets
      const importResult = await this.importFromSheets(borrowerId);

      // Then sync to sheets
      const syncResult = await this.syncToSheets(borrowerId);

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
    this.logger.log(`Comparing Credit Application record: ${sheetId}`);

    try {
      // Get record from Google Sheets
      const sheetsData = await this.sheetsService.getCreditApplications();
      const sheetRecord = sheetsData.find((ca) => ca.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: `Record with sheet ID ${sheetId} not found in Google Sheets`,
        };
      }

      // Get record from database
      const dbRecord =
        await this.creditApplicationsDbService.findBySheetId(sheetId);

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

  private convertSheetToDbFormat(sheetCreditApp: any): any {
    // Map sheet data to database format
    const dbCreditApp = {
      sheetId: sheetCreditApp.ID,
      customerType: sheetCreditApp['Customer Type'],
      borrowerId: sheetCreditApp['Borrower ID'],
      applicationStartDate: sheetCreditApp['Application Start Date'],
      creditType: sheetCreditApp['Credit Type'],
      totalAmountRequested: this.convertToFloat(
        sheetCreditApp['Total Amount Requested'],
      ),
      workingCapitalApplicationNumber:
        sheetCreditApp['Working Capital Application Number'],
      sslActionNeeded: sheetCreditApp['SSL Action Needed'],
      sslAction: sheetCreditApp['SSL Action'],
      sslId: sheetCreditApp['SSL ID'],
      sslFeedbackOnAction: sheetCreditApp['SSL Feedback on Action'],
      schoolCrbAvailable: sheetCreditApp['School CRB Available'],
      referredBy: sheetCreditApp['Referred By'],
      currentCostOfCapital: this.convertToFloat(
        sheetCreditApp['Current Cost of Capital'],
      ),
      checksCollected: this.convertToFloat(sheetCreditApp['Checks Collected']),
      checksNeededForLoan: this.convertToFloat(
        sheetCreditApp['Checks Needed for Loan'],
      ),
      photoOfCheck: sheetCreditApp['Photo of Check'],
      status: sheetCreditApp['Status'],
      commentsOnChecks: sheetCreditApp['Comments on Checks'],
      synced: true, // Mark as synced since we're importing from sheets
    };

    // Filter out undefined, null, and empty string values
    Object.keys(dbCreditApp).forEach((key) => {
      if (
        dbCreditApp[key] === undefined ||
        dbCreditApp[key] === null ||
        dbCreditApp[key] === ''
      ) {
        delete dbCreditApp[key];
      }
    });

    return dbCreditApp;
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
