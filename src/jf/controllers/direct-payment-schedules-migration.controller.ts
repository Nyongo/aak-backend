import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { DirectPaymentSchedulesDbService } from '../services/direct-payment-schedules-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/direct-payment-schedules-migration')
export class DirectPaymentSchedulesMigrationController {
  private readonly logger = new Logger(
    DirectPaymentSchedulesMigrationController.name,
  );

  constructor(
    private readonly directPaymentSchedulesDbService: DirectPaymentSchedulesDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Direct Payment Schedules');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getSheetData(
        'Dir. Payment Schedules',
      );
      const dbData = await this.directPaymentSchedulesDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((s) => ({
              borrowerId: s['Borrower ID'],
              loanId: s['Loan ID'],
              sheetId: s['Sheet ID'] || s['ID'],
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((s) => s.synced).length,
            unsynced: dbData.filter((s) => !s.synced).length,
            sample: dbData.slice(0, 3).map((s) => ({
              borrowerId: s.borrowerId,
              directLoanId: s.directLoanId,
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
  async importFromSheets(@Query('borrowerId') borrowerId?: string) {
    this.logger.log(
      `Starting import from Google Sheets${borrowerId ? ` for Borrower ID: ${borrowerId}` : ''}`,
    );

    try {
      // Get data from Google Sheets using the specific method
      const sheetsData = await this.sheetsService.getDirectPaymentSchedules();

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

      // Process each payment schedule from sheets
      for (const sheetSchedule of sheetsData) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetSchedule).length === 0) {
            this.logger.debug(
              `Skipping empty record: ${JSON.stringify(sheetSchedule)}`,
            );
            skipped++;
            skippedDetails.push({
              schedule: 'Empty Record',
              sheetId:
                sheetSchedule['Sheet ID'] || sheetSchedule['ID'] || 'No ID',
              reason: 'Completely empty record in Google Sheets',
            });
            continue;
          }

          // Find the ID field (try multiple possible names)
          const idValue = this.findIdField(sheetSchedule);

          // Skip records with empty ID
          if (!idValue) {
            this.logger.debug(
              `Skipping record with empty ID: ${JSON.stringify(sheetSchedule)}`,
            );
            skipped++;
            skippedDetails.push({
              schedule: sheetSchedule['Payment Schedule Number'] || 'Unknown',
              sheetId: 'Empty ID',
              reason:
                'Empty ID in Google Sheets - tried fields: Sheet ID, ID, Payment Schedule Number, Row Number',
            });
            continue;
          }

          // Check if schedule already exists in database
          const existingSchedule =
            await this.directPaymentSchedulesDbService.findBySheetId(idValue);

          if (existingSchedule) {
            skipped++;
            skippedDetails.push({
              schedule: sheetSchedule['Direct Loan ID'] || 'Unknown',
              sheetId: idValue,
              reason: 'Already exists in database',
            });
            continue;
          }

          // Convert sheet data to database format
          const dbSchedule =
            this.directPaymentSchedulesDbService.convertSheetToDb(
              sheetSchedule,
            );

          // Import to database with synced = true
          await this.directPaymentSchedulesDbService.create({
            ...dbSchedule,
            synced: true, // Mark as already synced since it came from sheets
          });

          imported++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            schedule: sheetSchedule['Direct Loan ID'] || 'Unknown',
            sheetId: this.findIdField(sheetSchedule) || 'Unknown',
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import schedule ${sheetSchedule['Direct Loan ID']}: ${errorMessage}`,
          );
        }
      }

      return {
        success: true,
        message: 'Import completed',
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
      return { success: false, error: errorMessage };
    }
  }

  @Post('sync-to-sheets')
  async syncToSheets(@Query('borrowerId') borrowerId?: string) {
    this.logger.log(
      `Starting sync to Google Sheets${borrowerId ? ` for Borrower ID: ${borrowerId}` : ''}`,
    );

    try {
      // Get unsynced schedules from database
      const unsyncedSchedules = borrowerId
        ? (
            await this.directPaymentSchedulesDbService.findByBorrowerId(
              borrowerId,
            )
          ).filter((s) => !s.synced)
        : await this.directPaymentSchedulesDbService
            .findAll()
            .then((schedules) => schedules.filter((s) => !s.synced));

      if (!unsyncedSchedules || unsyncedSchedules.length === 0) {
        return {
          success: true,
          message: 'No unsynced schedules found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced schedule
      for (const dbSchedule of unsyncedSchedules) {
        try {
          // Convert to sheet format
          const sheetSchedule =
            this.directPaymentSchedulesDbService.convertDbToSheet(dbSchedule);

          // Note: Sheets are read-only, so we just mark as synced
          // In a real implementation, you would add to Google Sheets here

          // Mark as synced in database
          await this.directPaymentSchedulesDbService.update(dbSchedule.id, {
            synced: true,
          });

          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            schedule: dbSchedule.directLoanId || 'Unknown',
            id: dbSchedule.id,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync schedule ${dbSchedule.directLoanId}: ${errorMessage}`,
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
  async fullMigration(@Query('borrowerId') borrowerId?: string) {
    this.logger.log(
      `Starting full migration${borrowerId ? ` for Borrower ID: ${borrowerId}` : ''}`,
    );

    try {
      // Step 1: Import from sheets
      const importResult = await this.importFromSheets(borrowerId);
      if (!importResult.success) {
        return importResult;
      }

      // Step 2: Sync to sheets
      const syncResult = await this.syncToSheets(borrowerId);
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

  @Get('columns')
  async getSheetColumns() {
    try {
      const sheetsData = await this.sheetsService.getDirectPaymentSchedules();

      if (sheetsData && sheetsData.length > 0) {
        const columns = Object.keys(sheetsData[0]);
        return {
          success: true,
          message: 'Sheet columns retrieved successfully',
          totalColumns: columns.length,
          columns: columns.map((col, index) => ({
            index: index + 1,
            name: col,
            sampleValue: sheetsData[0][col],
          })),
        };
      }

      return {
        success: false,
        message: 'No data found in sheet',
      };
    } catch (error) {
      this.logger.error('Error getting sheet columns:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('loans-columns')
  async getLoansColumns() {
    try {
      const sheetsData = await this.sheetsService.getLoans();

      if (sheetsData && sheetsData.length > 0) {
        const columns = Object.keys(sheetsData[0]);
        return {
          success: true,
          message: 'Loans sheet columns retrieved successfully',
          totalColumns: columns.length,
          columns: columns.map((col, index) => ({
            index: index + 1,
            name: col,
            sampleValue: sheetsData[0][col],
          })),
        };
      }

      return {
        success: false,
        message: 'No data found in Loans sheet',
      };
    } catch (error) {
      this.logger.error('Error getting loans sheet columns:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('compare/:sheetId')
  async compareSchedule(@Param('sheetId') sheetId: string) {
    this.logger.log(`Comparing schedule with sheet ID: ${sheetId}`);

    try {
      // Get from sheets
      const sheetSchedules = await this.sheetsService.getSheetData(
        'Dir. Payment Schedules',
      );
      const sheetSchedule = sheetSchedules.find(
        (s) => s['Sheet ID'] === sheetId || s['ID'] === sheetId,
      );

      if (!sheetSchedule) {
        return { success: false, error: 'Schedule not found in sheets' };
      }

      // Get from database
      const dbSchedule =
        await this.directPaymentSchedulesDbService.findBySheetId(sheetId);

      return {
        success: true,
        comparison: {
          sheets: sheetSchedule,
          database: dbSchedule || null,
          differences: dbSchedule
            ? this.findDifferences(sheetSchedule, dbSchedule)
            : null,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare schedule: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private findDifferences(sheetData: any, dbData: any) {
    const differences = [];
    const sheetFields =
      this.directPaymentSchedulesDbService.convertSheetToDb(sheetData);

    for (const [key, value] of Object.entries(sheetFields)) {
      if (key !== 'createdAt' && key !== 'synced') {
        const dbValue = dbData[key];
        if (value !== dbValue) {
          differences.push({
            field: key,
            sheets: value,
            database: dbValue,
          });
        }
      }
    }

    return differences;
  }

  private findIdField(sheetData: any): string | null {
    // Try multiple possible ID field names, prioritize 'ID'
    const possibleIdFields = [
      'ID', // Prioritize this one
      'Sheet ID',
      'Payment Schedule Number',
      'Row Number',
      'Schedule ID',
      'Payment ID',
    ];

    for (const field of possibleIdFields) {
      const value = sheetData[field];

      if (value && value.toString().trim() !== '') {
        const trimmedValue = value.toString().trim();
        return trimmedValue;
      }
    }

    return null;
  }
}
