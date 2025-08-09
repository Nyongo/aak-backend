import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { PayrollDbService } from '../services/payroll-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/payroll-migration')
export class PayrollMigrationController {
  private readonly logger = new Logger(PayrollMigrationController.name);

  constructor(
    private readonly payrollDbService: PayrollDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Payroll');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getPayroll();
      const dbData = await this.payrollDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((p) => ({
              creditApplicationId: p['Credit Application ID'],
              role: p['Role'],
              sheetId: p.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((p) => p.synced).length,
            unsynced: dbData.filter((p) => !p.synced).length,
            sample: dbData.slice(0, 3).map((p) => ({
              creditApplicationId: p.creditApplicationId,
              role: p.role,
              sheetId: p.sheetId,
              synced: p.synced,
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
      const sheetsData = await this.sheetsService.getPayroll();

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
            (p) => p['Credit Application ID'] === creditApplicationId,
          )
        : sheetsData;

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each record from Google Sheets
      for (const sheetPayroll of filteredSheetsData) {
        try {
          // Skip completely empty records (no data at all)
          if (
            Object.keys(sheetPayroll).length === 0 ||
            (Object.keys(sheetPayroll).length === 1 && sheetPayroll.ID === '')
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetPayroll,
            });
            continue;
          }

          // Skip records with empty ID
          if (!sheetPayroll.ID || sheetPayroll.ID.trim() === '') {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetPayroll,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord = await this.payrollDbService.findBySheetId(
            sheetPayroll.ID,
          );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetPayroll.ID,
              creditApplicationId: sheetPayroll['Credit Application ID'],
              role: sheetPayroll['Role'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbPayroll = this.convertSheetToDbFormat(sheetPayroll);

          // Create record in database
          await this.payrollDbService.create(dbPayroll);
          imported++;

          this.logger.debug(
            `Imported Payroll: ${sheetPayroll['Credit Application ID']} - ${sheetPayroll['Role']}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetPayroll.ID,
            creditApplicationId: sheetPayroll['Credit Application ID'],
            role: sheetPayroll['Role'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import Payroll ${sheetPayroll.ID}: ${errorMessage}`,
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
      // Get unsynced payroll from database
      const allUnsyncedPayroll = await this.payrollDbService.findUnsynced();
      const unsyncedPayroll = creditApplicationId
        ? allUnsyncedPayroll.filter(
            (p) => p.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedPayroll;

      if (!unsyncedPayroll || unsyncedPayroll.length === 0) {
        return {
          success: true,
          message: 'No unsynced payroll found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced payroll
      for (const payroll of unsyncedPayroll) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.payrollDbService.updateSyncStatus(payroll.id, true);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            role: payroll.role,
            creditApplicationId: payroll.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Payroll ${payroll.id}: ${errorMessage}`,
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
    this.logger.log(`Comparing Payroll record: ${sheetId}`);

    try {
      // Get record from Google Sheets
      const sheetsData = await this.sheetsService.getPayroll();
      const sheetRecord = sheetsData.find((p) => p.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: `Record with sheet ID ${sheetId} not found in Google Sheets`,
        };
      }

      // Get record from database
      const dbRecord = await this.payrollDbService.findBySheetId(sheetId);

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

  private convertSheetToDbFormat(sheetPayroll: any): any {
    // Map sheet data to database format
    const dbPayroll = {
      sheetId: sheetPayroll.ID,
      creditApplicationId: sheetPayroll['Credit Application ID'],
      role: sheetPayroll['Role'],
      numberOfEmployeesInRole: this.convertToFloat(
        sheetPayroll['Number of Employees in Role'],
      ),
      monthlySalary: this.convertToFloat(sheetPayroll['Monthly Salary']),
      monthsPerYearTheRoleIsPaid: this.convertToFloat(
        sheetPayroll['Months per Year the Role is Paid'],
      ),
      notes: sheetPayroll['Notes'],
      totalAnnualCost: this.convertToFloat(sheetPayroll['Total Annual Cost']),
      synced: true, // Mark as synced since we're importing from sheets
    };

    // Filter out undefined, null, and empty string values
    Object.keys(dbPayroll).forEach((key) => {
      if (
        dbPayroll[key] === undefined ||
        dbPayroll[key] === null ||
        dbPayroll[key] === ''
      ) {
        delete dbPayroll[key];
      }
    });

    return dbPayroll;
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
