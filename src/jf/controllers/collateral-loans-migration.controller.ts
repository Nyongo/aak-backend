import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';
import { CollateralLoansDbService } from '../services/collateral-loans-db.service';

@Controller('jf/collateral-loans-migration')
export class CollateralLoansMigrationController {
  private readonly logger = new Logger(CollateralLoansMigrationController.name);

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly collateralLoansDbService: CollateralLoansDbService,
  ) {}

  @Get('status')
  async getStatus() {
    try {
      const [dbCount, sheetsCount] = await Promise.all([
        this.collateralLoansDbService.countAll(),
        this.sheetsService.getCollateralLoansCount(),
      ]);

      return {
        success: true,
        database: { total: dbCount },
        sheets: { total: sheetsCount },
        syncStatus: dbCount === sheetsCount ? 'Synced' : 'Out of sync',
      };
    } catch (error) {
      this.logger.error(
        'Error getting collateral loans migration status:',
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to get status',
      };
    }
  }

  @Post('import-from-sheets')
  async importFromSheets(@Query('loanId') loanId?: string) {
    this.logger.log(
      `Starting Collateral Loan import from Google Sheets${
        loanId ? ` for Loan ID: ${loanId}` : ''
      }`,
    );

    try {
      const sheetsData = await this.sheetsService.getCollateralLoans();

      if (!sheetsData || sheetsData.length === 0) {
        return {
          success: true,
          message: 'No data found in Collateral Loan sheet',
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

      for (const sheetRecord of sheetsData) {
        try {
          if (!sheetRecord || Object.keys(sheetRecord).length === 0) {
            skipped++;
            skippedDetails.push({
              collateralLoan: 'Empty Record',
              sheetId: '(none)',
              reason: 'Completely empty record in Google Sheets',
            });
            continue;
          }

          const sheetId =
            this.collateralLoansDbService.extractSheetId(sheetRecord);
          if (!sheetId) {
            skipped++;
            skippedDetails.push({
              collateralLoan: 'Unknown',
              sheetId: '(missing)',
              reason: 'No ID/Sheet ID field found',
            });
            continue;
          }

          if (loanId) {
            const recordLoanId =
              sheetRecord['Direct Loan ID'] ||
              sheetRecord['Loan ID'] ||
              sheetRecord['loanId'] ||
              null;
            if (recordLoanId !== loanId) {
              skipped++;
              skippedDetails.push({
                collateralLoan: 'Filtered',
                sheetId,
                reason: `Loan ID mismatch: expected ${loanId}, got ${recordLoanId}`,
              });
              continue;
            }
          }

          const dbPayload =
            this.collateralLoansDbService.convertSheetToDb(sheetRecord);

          const existing =
            await this.collateralLoansDbService.findBySheetId(sheetId);

          if (existing) {
            await this.collateralLoansDbService.update(existing.id, dbPayload);
            updated++;
          } else {
            await this.collateralLoansDbService.create(dbPayload);
            imported++;
          }
        } catch (error) {
          errors++;
          errorDetails.push({
            sheetId:
              this.collateralLoansDbService.extractSheetId(sheetRecord) ||
              '(unknown)',
            error: error instanceof Error ? error.message : String(error),
          });
          this.logger.error('Error importing collateral loan row:', error);
        }
      }

      return {
        success: true,
        message: 'Collateral Loan import completed',
        imported,
        updated,
        skipped,
        errors,
        errorDetails: errorDetails.length ? errorDetails : undefined,
        skippedDetails: skippedDetails.length ? skippedDetails : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to import collateral loans from sheets:', error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to import collateral loans',
      };
    }
  }

  @Post('full-migration')
  async fullMigration(@Query('loanId') loanId?: string) {
    this.logger.log(
      `Starting full Collateral Loan migration${
        loanId ? ` for Loan ID: ${loanId}` : ''
      }`,
    );

    const importResult = await this.importFromSheets(loanId);
    if (!importResult.success) {
      return importResult;
    }

    return {
      success: true,
      message: 'Full Collateral Loan migration completed',
      import: importResult,
    };
  }

  @Get('columns')
  async getSheetColumns() {
    try {
      const sheetsData = await this.sheetsService.getCollateralLoans();

      if (sheetsData && sheetsData.length > 0) {
        const columns = Object.keys(sheetsData[0]);

        this.logger.log(
          `Found ${columns.length} columns in Collateral Loan sheet:`,
        );
        columns.forEach((col, index) => {
          this.logger.log(`${index + 1}. "${col}"`);
        });

        const sampleRecords = sheetsData.slice(0, 3).map((record, idx) => {
          const sample: any = { row: idx + 1 };
          columns.forEach((col) => {
            const value = record[col];
            sample[col] =
              value !== undefined && value !== null && value !== ''
                ? String(value).substring(0, 100)
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
        message: 'No data found in Collateral Loan sheet',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get collateral loan sheet columns: ${errorMessage}`,
      );
      return { success: false, error: errorMessage };
    }
  }
}

