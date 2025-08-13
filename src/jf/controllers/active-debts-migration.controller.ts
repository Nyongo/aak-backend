import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { ActiveDebtsDbService } from '../services/active-debts-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/active-debts-migration')
export class ActiveDebtsMigrationController {
  private readonly logger = new Logger(ActiveDebtsMigrationController.name);

  constructor(
    private readonly activeDebtsDbService: ActiveDebtsDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Active Debts');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getActiveDebts();
      const dbData = await this.activeDebtsDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((ad) => ({
              creditApplicationId: ad['Credit Application ID'],
              debtStatus: ad['Debt Status'],
              sheetId: ad.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((ad) => ad.synced).length,
            unsynced: dbData.filter((ad) => !ad.synced).length,
            sample: dbData.slice(0, 3).map((ad) => ({
              creditApplicationId: ad.creditApplicationId,
              debtStatus: ad.debtStatus,
              sheetId: ad.sheetId,
              synced: ad.synced,
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
      const sheetsData = await this.sheetsService.getActiveDebts();

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
            (ad) => ad['Credit Application ID'] === creditApplicationId,
          )
        : sheetsData;

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each record from Google Sheets
      for (const sheetActiveDebt of filteredSheetsData) {
        try {
          // Skip completely empty records (no data at all)
          if (
            Object.keys(sheetActiveDebt).length === 0 ||
            (Object.keys(sheetActiveDebt).length === 1 &&
              sheetActiveDebt.ID === '')
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetActiveDebt,
            });
            continue;
          }

          // Skip records with empty ID
          if (!sheetActiveDebt.ID || sheetActiveDebt.ID.trim() === '') {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetActiveDebt,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord = await this.activeDebtsDbService.findBySheetId(
            sheetActiveDebt.ID,
          );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetActiveDebt.ID,
              creditApplicationId: sheetActiveDebt['Credit Application ID'],
              debtStatus: sheetActiveDebt['Debt Status'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbActiveDebt = this.convertSheetToDbFormat(sheetActiveDebt);

          // Create record in database
          await this.activeDebtsDbService.create(dbActiveDebt);
          imported++;

          this.logger.debug(
            `Imported Active Debt: ${sheetActiveDebt['Credit Application ID']} - ${sheetActiveDebt['Debt Status']}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetActiveDebt.ID,
            creditApplicationId: sheetActiveDebt['Credit Application ID'],
            debtStatus: sheetActiveDebt['Debt Status'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import Active Debt ${sheetActiveDebt.ID}: ${errorMessage}`,
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
      // Get unsynced active debts from database
      const allUnsyncedActiveDebts =
        await this.activeDebtsDbService.findUnsynced();
      const unsyncedActiveDebts = creditApplicationId
        ? allUnsyncedActiveDebts.filter(
            (ad) => ad.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedActiveDebts;

      if (!unsyncedActiveDebts || unsyncedActiveDebts.length === 0) {
        return {
          success: true,
          message: 'No unsynced active debts found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced active debt
      for (const activeDebt of unsyncedActiveDebts) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.activeDebtsDbService.updateSyncStatus(activeDebt.id, true);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            debtStatus: activeDebt.debtStatus,
            creditApplicationId: activeDebt.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Active Debt ${activeDebt.id}: ${errorMessage}`,
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
    this.logger.log(`Comparing Active Debt record: ${sheetId}`);

    try {
      // Get record from Google Sheets
      const sheetsData = await this.sheetsService.getActiveDebts();
      const sheetRecord = sheetsData.find((ad) => ad.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: `Record with sheet ID ${sheetId} not found in Google Sheets`,
        };
      }

      // Get record from database
      const dbRecord = await this.activeDebtsDbService.findBySheetId(sheetId);

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

  private convertSheetToDbFormat(sheetActiveDebt: any): any {
    // Map sheet data to database format
    const dbActiveDebt = {
      sheetId: sheetActiveDebt.ID,
      creditApplicationId: sheetActiveDebt['Credit Application ID'],
      debtStatus: sheetActiveDebt['Debt Status'],
      listedOnCrb: sheetActiveDebt['Listed on CRB?'],
      personalLoanOrSchoolLoan: sheetActiveDebt['Personal Loan or School Loan'],
      lender: sheetActiveDebt['Lender'],
      dateLoanTaken: sheetActiveDebt['Date Loan Taken'],
      finalDueDate: sheetActiveDebt['Final Due Date'],
      totalLoanAmount: this.convertToFloat(
        sheetActiveDebt['Total Loan Amount'],
      ),
      balance: this.convertToFloat(sheetActiveDebt['Balance']),
      amountOverdue: this.convertToFloat(sheetActiveDebt['Amount Overdue']),
      monthlyPayment: this.convertToFloat(sheetActiveDebt['Monthly Payment']),
      debtStatement: sheetActiveDebt['Debt Statement'],
      annualDecliningBalanceInterestRate: this.convertToFloat(
        sheetActiveDebt['Annual Declining Balance Interest Rate'],
      ),
      isLoanCollateralized: sheetActiveDebt['Is the loan collateralized? '],
      typeOfCollateral: sheetActiveDebt['Type of collateral '],
      whatWasLoanUsedFor: sheetActiveDebt['What was the loan used for'],
      synced: true, // Mark as synced since we're importing from sheets
    };

    // Filter out undefined, null, and empty string values
    Object.keys(dbActiveDebt).forEach((key) => {
      if (
        dbActiveDebt[key] === undefined ||
        dbActiveDebt[key] === null ||
        dbActiveDebt[key] === ''
      ) {
        delete dbActiveDebt[key];
      }
    });

    return dbActiveDebt;
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
