import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { WriteOffsDbService } from '../services/write-offs-db.service';
import { SheetsService } from '../services/sheets.service';

@Controller('jf/write-offs-migration')
export class WriteOffsMigrationController {
  private readonly logger = new Logger(WriteOffsMigrationController.name);

  constructor(
    private readonly writeOffsDbService: WriteOffsDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    try {
      const [dbCount, sheetsCount] = await Promise.all([
        this.writeOffsDbService.getWriteOffsCount(),
        this.sheetsService.getWriteOffsCount(),
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
      const sheetsData = await this.sheetsService.getWriteOffs();

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

      // Process each write off from sheets
      for (const sheetWriteOff of sheetsData) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetWriteOff).length === 0) {
            skipped++;
            skippedDetails.push({
              writeOff: 'Empty Record',
              sheetId: sheetWriteOff['ID'] || 'No ID',
              reason: 'Completely empty record in Google Sheets',
            });
            continue;
          }

          // Find the ID field
          const idValue = this.findIdField(sheetWriteOff);
          
          // Skip records with empty ID
          if (!idValue) {
            skipped++;
            skippedDetails.push({
              writeOff: 'Unknown',
              sheetId: 'Empty ID',
              reason: 'Empty ID in Google Sheets - tried fields: ID',
            });
            continue;
          }

          // Filter by loanId if provided
          if (loanId) {
            const recordLoanId = sheetWriteOff['Loan ID'] || sheetWriteOff['loanId'];
            if (recordLoanId !== loanId) {
              skipped++;
              skippedDetails.push({
                writeOff: 'Filtered',
                sheetId: idValue,
                reason: `Loan ID mismatch: expected ${loanId}, got ${recordLoanId}`,
              });
              continue;
            }
          }

          // Check if write off already exists in database
          const existingWriteOff = await this.writeOffsDbService.findBySheetId(idValue);

          if (existingWriteOff) {
            skipped++;
            skippedDetails.push({
              writeOff: sheetWriteOff['Loan ID'] || 'Unknown',
              sheetId: idValue,
              reason: 'Already exists in database',
            });
            continue;
          }

          // Convert sheet data to database format
          const dbWriteOff = this.writeOffsDbService.convertSheetToDb(sheetWriteOff);

          // Create write off in database
          await this.writeOffsDbService.create(dbWriteOff);
          imported++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            writeOff: sheetWriteOff['Loan ID'] || 'Unknown',
            sheetId: sheetWriteOff['ID'] || 'No ID',
            error: errorMessage,
          });
          this.logger.error(
            `Error importing write off with ID ${sheetWriteOff['ID']}:`,
            error,
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
        skippedDetails:
          skippedDetails.length > 0 ? skippedDetails : undefined,
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
      const sheetsData = await this.sheetsService.getWriteOffs();

      if (sheetsData && sheetsData.length > 0) {
        const columns = Object.keys(sheetsData[0]);

        // Log all column names to help with debugging
        this.logger.log(
          `Found ${columns.length} columns in Write Offs sheet:`,
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
