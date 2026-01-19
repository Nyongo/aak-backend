import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { RestructuringsDbService } from '../services/restructurings-db.service';
import { SheetsService } from '../services/sheets.service';

@Controller('jf/restructurings-migration')
export class RestructuringsMigrationController {
  private readonly logger = new Logger(RestructuringsMigrationController.name);

  constructor(
    private readonly restructuringsDbService: RestructuringsDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    try {
      const [dbCount, sheetsCount] = await Promise.all([
        this.restructuringsDbService.getRestructuringsCount(),
        this.sheetsService.getRestructuringsCount(),
      ]);

      return {
        success: true,
        database: {
          total: dbCount,
        },
        sheets: {
          total: sheetsCount,
        },
        syncStatus: dbCount === sheetsCount ? 'Synced' : 'Out of sync',
      };
    } catch (error) {
      this.logger.error('Error getting migration status:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('import-from-sheets')
  async importFromSheets(@Query('loanId') loanId?: string) {
    this.logger.log(
      `Starting import from Google Sheets${loanId ? ` for Loan ID: ${loanId}` : ''}`,
    );

    try {
      // Get data from Google Sheets
      const sheetsData = await this.sheetsService.getRestructurings();

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

      // Process each restructuring from sheets
      for (const sheetRestructuring of sheetsData) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetRestructuring).length === 0) {
            skipped++;
            skippedDetails.push({
              restructuring: 'Empty Record',
              sheetId: sheetRestructuring['ID'] || 'No ID',
              reason: 'Completely empty record in Google Sheets',
            });
            continue;
          }

          // Find the ID field
          const idValue = this.findIdField(sheetRestructuring);

          // Skip records with empty ID
          if (!idValue) {
            skipped++;
            skippedDetails.push({
              restructuring: 'Unknown',
              sheetId: 'Empty ID',
              reason: 'Empty ID in Google Sheets - tried fields: ID, Sheet ID',
            });
            continue;
          }

          // Filter by loanId if provided
          if (loanId) {
            const recordLoanId =
              sheetRestructuring['Loan ID'] || sheetRestructuring['loanId'];
            if (recordLoanId !== loanId) {
              skipped++;
              skippedDetails.push({
                restructuring: 'Filtered',
                sheetId: idValue,
                reason: `Loan ID mismatch: expected ${loanId}, got ${recordLoanId}`,
              });
              continue;
            }
          }

          // Convert sheet data to database format
          const dbRestructuring =
            this.restructuringsDbService.convertSheetToDb(sheetRestructuring);

          // Check if restructuring already exists in database
          const existingRestructuring =
            await this.restructuringsDbService.findBySheetId(idValue);

          if (existingRestructuring) {
            // Update existing record
            await this.restructuringsDbService.update(
              existingRestructuring.id,
              dbRestructuring,
            );
            updated++;
            this.logger.debug(`Updated existing restructuring: ${idValue}`);
          } else {
            // Create new record
            await this.restructuringsDbService.create(dbRestructuring);
            imported++;
            this.logger.debug(`Created new restructuring: ${idValue}`);
          }
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            restructuring: sheetRestructuring['Loan ID'] || 'Unknown',
            sheetId: sheetRestructuring['ID'] || 'No ID',
            error: errorMessage,
          });
          this.logger.error(
            `Error importing restructuring with ID ${sheetRestructuring['ID']}:`,
            error,
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

  @Post('full-migration')
  async fullMigration(@Query('loanId') loanId?: string) {
    this.logger.log(
      `Starting full migration${loanId ? ` for Loan ID: ${loanId}` : ''}`,
    );

    try {
      // Step 1: Import from sheets
      const importResult = await this.importFromSheets(loanId);
      if (!importResult.success) {
        return importResult;
      }

      return {
        success: true,
        message: 'Full migration completed',
        import: importResult,
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
      const sheetsData = await this.sheetsService.getRestructurings();

      if (sheetsData && sheetsData.length > 0) {
        const columns = Object.keys(sheetsData[0]);

        // Log all column names to help with debugging
        this.logger.log(
          `Found ${columns.length} columns in Restructurings sheet:`,
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
