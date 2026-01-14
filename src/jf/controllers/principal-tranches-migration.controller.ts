import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { PrincipalTranchesDbService } from '../services/principal-tranches-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/principal-tranches-migration')
export class PrincipalTranchesMigrationController {
  private readonly logger = new Logger(
    PrincipalTranchesMigrationController.name,
  );

  constructor(
    private readonly principalTranchesDbService: PrincipalTranchesDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Principal Tranches');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getPrincipalTranches();
      const dbData = await this.principalTranchesDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((s) => ({
              directLoanId: s['Direct Loan ID'],
              amount: s['Amount'],
              sheetId: s['ID'],
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((s) => s.synced).length,
            unsynced: dbData.filter((s) => !s.synced).length,
            sample: dbData.slice(0, 3).map((s) => ({
              directLoanId: s.directLoanId,
              amount: s.amount,
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
  async importFromSheets(@Query('directLoanId') directLoanId?: string) {
    this.logger.log(
      `Starting import from Google Sheets${directLoanId ? ` for Direct Loan ID: ${directLoanId}` : ''}`,
    );

    try {
      // Get data from Google Sheets using the specific method
      const sheetsData = await this.sheetsService.getPrincipalTranches();

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

      // Process each tranche from sheets
      for (const sheetTranche of sheetsData) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetTranche).length === 0) {
            this.logger.debug(
              `Skipping empty record: ${JSON.stringify(sheetTranche)}`,
            );
            skipped++;
            skippedDetails.push({
              tranche: 'Empty Record',
              sheetId:
                sheetTranche['Sheet ID'] || sheetTranche['ID'] || 'No ID',
              reason: 'Completely empty record in Google Sheets',
            });
            continue;
          }

          // Find the ID field (try multiple possible names)
          const idValue = this.findIdField(sheetTranche);

          // Skip records with empty ID
          if (!idValue) {
            this.logger.debug(
              `Skipping record with empty ID: ${JSON.stringify(sheetTranche)}`,
            );
            skipped++;
            skippedDetails.push({
              tranche: sheetTranche['Direct Loan ID'] || 'Unknown',
              sheetId: 'Empty ID',
              reason: 'Empty ID in Google Sheets - tried fields: Sheet ID, ID',
            });
            continue;
          }

          // Filter by directLoanId if provided
          if (directLoanId) {
            const trancheDirectLoanId =
              sheetTranche['Direct Loan ID'] || sheetTranche['directLoanId'];
            if (trancheDirectLoanId !== directLoanId) {
              skipped++;
              continue;
            }
          }

          // Convert sheet data to database format
          const dbTranche =
            this.principalTranchesDbService.convertSheetToDb(sheetTranche);

          // Check if tranche already exists in database
          const existingTranche =
            await this.principalTranchesDbService.findBySheetId(idValue);

          if (existingTranche) {
            // Update existing record
            await this.principalTranchesDbService.update(existingTranche.id, {
              ...dbTranche,
              synced: true, // Mark as synced since it came from sheets
            });
            updated++;
            this.logger.debug(`Updated existing principal tranche: ${idValue}`);
          } else {
            // Create new record
            await this.principalTranchesDbService.create({
              ...dbTranche,
              synced: true, // Mark as already synced since it came from sheets
            });
            imported++;
            this.logger.debug(`Created new principal tranche: ${idValue}`);
          }
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            tranche: sheetTranche['Direct Loan ID'] || 'Unknown',
            sheetId: this.findIdField(sheetTranche) || 'Unknown',
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import tranche ${sheetTranche['Direct Loan ID']}: ${errorMessage}`,
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

  @Post('sync-to-sheets')
  async syncToSheets(@Query('directLoanId') directLoanId?: string) {
    this.logger.log(
      `Starting sync to Google Sheets${directLoanId ? ` for Direct Loan ID: ${directLoanId}` : ''}`,
    );

    try {
      // Get unsynced tranches from database
      const unsyncedTranches = directLoanId
        ? (
            await this.principalTranchesDbService.findByDirectLoanId(
              directLoanId,
            )
          ).filter((t) => !t.synced)
        : await this.principalTranchesDbService
            .findAll()
            .then((tranches) => tranches.filter((t) => !t.synced));

      if (!unsyncedTranches || unsyncedTranches.length === 0) {
        return {
          success: true,
          message: 'No unsynced tranches found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced tranche
      for (const dbTranche of unsyncedTranches) {
        try {
          // Note: Sheets are read-only, so we just mark as synced
          // In a real implementation, you would add to Google Sheets here

          // Mark as synced in database
          await this.principalTranchesDbService.update(dbTranche.id, {
            synced: true,
          });

          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            tranche: dbTranche.directLoanId || 'Unknown',
            id: dbTranche.id,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync tranche ${dbTranche.directLoanId}: ${errorMessage}`,
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
  async fullMigration(@Query('directLoanId') directLoanId?: string) {
    this.logger.log(
      `Starting full migration${directLoanId ? ` for Direct Loan ID: ${directLoanId}` : ''}`,
    );

    try {
      // Step 1: Import from sheets
      const importResult = await this.importFromSheets(directLoanId);
      if (!importResult.success) {
        return importResult;
      }

      // Step 2: Sync to sheets
      const syncResult = await this.syncToSheets(directLoanId);
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

  @Get('compare/:sheetId')
  async compareTranche(@Param('sheetId') sheetId: string) {
    this.logger.log(`Comparing tranche with sheet ID: ${sheetId}`);

    try {
      // Get data from sheets
      const sheetsData = await this.sheetsService.getPrincipalTranches();
      const sheetRecord = sheetsData.find(
        (s) => s['Sheet ID'] === sheetId || s['ID'] === sheetId,
      );

      // Get data from database
      const dbRecord =
        await this.principalTranchesDbService.findBySheetId(sheetId);

      if (!sheetRecord && !dbRecord) {
        return {
          success: false,
          message: 'Record not found in either source',
        };
      }

      return {
        success: true,
        comparison: {
          sheet: sheetRecord || null,
          database: dbRecord || null,
          matches: JSON.stringify(sheetRecord) === JSON.stringify(dbRecord),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare tranche: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('columns')
  async getSheetColumns() {
    try {
      const sheetsData = await this.sheetsService.getPrincipalTranches();

      if (sheetsData && sheetsData.length > 0) {
        const columns = Object.keys(sheetsData[0]);

        // Log all column names to help with debugging
        this.logger.log(
          `Found ${columns.length} columns in Principal Tranches sheet:`,
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
