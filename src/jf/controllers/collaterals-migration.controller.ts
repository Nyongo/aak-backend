import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';
import { CollateralsDbService } from '../services/collaterals-db.service';

@Controller('jf/collaterals-migration')
export class CollateralsMigrationController {
  private readonly logger = new Logger(CollateralsMigrationController.name);

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly collateralsDbService: CollateralsDbService,
  ) {}

  @Get('status')
  async getStatus() {
    try {
      const [dbCount, sheetsCount] = await Promise.all([
        this.collateralsDbService.countAll(),
        this.sheetsService.getCollateralsCount(),
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
      this.logger.error('Error getting collaterals migration status:', error);
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
      `Starting Collateral import from Google Sheets${
        loanId ? ` for Loan ID: ${loanId}` : ''
      }`,
    );

    try {
      const sheetsData = await this.sheetsService.getCollaterals();

      if (!sheetsData || sheetsData.length === 0) {
        return {
          success: true,
          message: 'No data found in Collateral sheet',
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
              collateral: 'Empty Record',
              sheetId: '(none)',
              reason: 'Completely empty record in Google Sheets',
            });
            continue;
          }

          const sheetId = this.collateralsDbService.extractSheetId(sheetRecord);
          if (!sheetId) {
            skipped++;
            skippedDetails.push({
              collateral: 'Unknown',
              sheetId: '(missing)',
              reason: 'No ID/Sheet ID field found',
            });
            continue;
          }

          if (loanId) {
            const recordLoanId =
              sheetRecord['Loan ID'] || sheetRecord['loanId'] || null;
            if (recordLoanId !== loanId) {
              skipped++;
              skippedDetails.push({
                collateral: 'Filtered',
                sheetId,
                reason: `Loan ID mismatch: expected ${loanId}, got ${recordLoanId}`,
              });
              continue;
            }
          }

          const dbPayload =
            this.collateralsDbService.convertSheetToDb(sheetRecord);

          const existing =
            await this.collateralsDbService.findBySheetId(sheetId);

          if (existing) {
            await this.collateralsDbService.update(existing.id, dbPayload);
            updated++;
          } else {
            await this.collateralsDbService.create(dbPayload);
            imported++;
          }
        } catch (error) {
          errors++;
          errorDetails.push({
            sheetId:
              this.collateralsDbService.extractSheetId(sheetRecord) ||
              '(unknown)',
            error: error instanceof Error ? error.message : String(error),
          });
          this.logger.error('Error importing collateral row:', error);
        }
      }

      return {
        success: true,
        message: 'Collateral import completed',
        imported,
        updated,
        skipped,
        errors,
        errorDetails: errorDetails.length ? errorDetails : undefined,
        skippedDetails: skippedDetails.length ? skippedDetails : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to import collaterals from sheets:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to import collaterals',
      };
    }
  }

  @Post('full-migration')
  async fullMigration(@Query('loanId') loanId?: string) {
    this.logger.log(
      `Starting full Collateral migration${
        loanId ? ` for Loan ID: ${loanId}` : ''
      }`,
    );

    const importResult = await this.importFromSheets(loanId);
    if (!importResult.success) {
      return importResult;
    }

    return {
      success: true,
      message: 'Full Collateral migration completed',
      import: importResult,
    };
  }

  @Get('columns')
  async getSheetColumns() {
    try {
      const sheetsData = await this.sheetsService.getCollaterals();

      if (sheetsData && sheetsData.length > 0) {
        const columns = Object.keys(sheetsData[0]);

        this.logger.log(
          `Found ${columns.length} columns in Collateral sheet:`,
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
        message: 'No data found in Collateral sheet',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get collateral sheet columns: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}

