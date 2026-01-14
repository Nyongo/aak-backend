import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { DirectorsDbService } from '../services/directors-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/directors-migration')
export class DirectorsMigrationController {
  private readonly logger = new Logger(DirectorsMigrationController.name);

  constructor(
    private readonly directorsDbService: DirectorsDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Directors');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getDirectors();
      const dbData = await this.directorsDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((d) => ({
              name: d.Name,
              borrowerId: d['Borrower ID'],
              sheetId: d.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((d) => d.synced).length,
            unsynced: dbData.filter((d) => !d.synced).length,
            sample: dbData.slice(0, 3).map((d) => ({
              name: d.name,
              borrowerId: d.borrowerId,
              sheetId: d.sheetId,
              synced: d.synced,
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
        ? await this.sheetsService.getDirectors(borrowerId)
        : await this.sheetsService.getDirectors();

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
      let updated = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each director from sheets
      for (const sheetDirector of sheetsData) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetDirector).length === 0) {
            this.logger.debug(
              `Skipping empty record: ${JSON.stringify(sheetDirector)}`,
            );
            skipped++;
            skippedDetails.push({
              director: 'Empty Record',
              sheetId: sheetDirector.ID || 'No ID',
              reason: 'Completely empty record in Google Sheets',
            });
            continue;
          }

          // Skip records with empty ID
          if (!sheetDirector.ID || sheetDirector.ID.trim() === '') {
            this.logger.debug(
              `Skipping record with empty ID: ${JSON.stringify(sheetDirector)}`,
            );
            skipped++;
            skippedDetails.push({
              director: sheetDirector.Name || 'Unknown',
              sheetId: 'Empty ID',
              reason: 'Empty ID in Google Sheets',
            });
            continue;
          }

          // Convert sheet data to database format
          const dbDirector = this.convertSheetToDbFormat(sheetDirector);

          // Check if director already exists in database
          const existingDirector = await this.directorsDbService.findBySheetId(
            sheetDirector.ID,
          );

          if (existingDirector) {
            // Update existing record
            await this.directorsDbService.update(String(existingDirector.id), {
              ...dbDirector,
              synced: true, // Mark as synced since it came from sheets
            });
            updated++;
            this.logger.debug(
              `Updated existing director: ${sheetDirector.Name} (ID: ${sheetDirector.ID})`,
            );
          } else {
            // Create new record
            await this.directorsDbService.create({
              ...dbDirector,
              synced: true, // Mark as already synced since it came from sheets
            });
            imported++;
            this.logger.debug(
              `Created new director: ${sheetDirector.Name} (ID: ${sheetDirector.ID})`,
            );
          }
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            director: sheetDirector.Name || 'Unknown',
            sheetId: sheetDirector.ID,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import director ${sheetDirector.Name}: ${errorMessage}`,
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
  async syncToSheets(@Query('borrowerId') borrowerId?: string) {
    this.logger.log(
      `Starting sync to Google Sheets${borrowerId ? ` for Borrower ID: ${borrowerId}` : ''}`,
    );

    try {
      // Get unsynced directors from database
      const unsyncedDirectors = borrowerId
        ? (await this.directorsDbService.findByBorrowerId(borrowerId)).filter(
            (d) => !d.synced,
          )
        : await this.directorsDbService.findUnsynced();

      if (!unsyncedDirectors || unsyncedDirectors.length === 0) {
        return {
          success: true,
          message: 'No unsynced directors found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced director
      for (const dbDirector of unsyncedDirectors) {
        try {
          // Convert to sheet format
          const sheetDirector = this.directorsDbService.convertDbArrayToSheet([
            dbDirector,
          ])[0];

          // Add to Google Sheets
          await this.sheetsService.addDirector(sheetDirector);

          // Mark as synced in database
          await this.directorsDbService.updateSyncStatus(dbDirector.id, true);

          this.logger.debug(
            `Synced director: ${dbDirector.name} (ID: ${dbDirector.id})`,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            director: dbDirector.name || 'Unknown',
            id: dbDirector.id,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync director ${dbDirector.name}: ${errorMessage}`,
          );
        }
      }

      return {
        success: true,
        message: 'Sync completed',
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

  @Get('compare/:sheetId')
  async compareDirector(@Param('sheetId') sheetId: string) {
    this.logger.log(`Comparing director with sheet ID: ${sheetId}`);

    try {
      // Get from sheets
      const sheetsData = await this.sheetsService.getDirectors();
      const sheetDirector = sheetsData.find((d) => d.ID === sheetId);
      if (!sheetDirector) {
        return { success: false, error: 'Director not found in sheets' };
      }

      // Get from database
      const dbDirector = await this.directorsDbService.findBySheetId(sheetId);
      if (!dbDirector) {
        return { success: false, error: 'Director not found in database' };
      }

      // Convert database director to sheet format for comparison
      const dbDirectorSheetFormat =
        this.directorsDbService.convertDbArrayToSheet([dbDirector])[0];

      return {
        success: true,
        comparison: {
          sheetId,
          sheets: sheetDirector,
          database: dbDirectorSheetFormat,
          synced: dbDirector.synced,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare director: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('debug/empty-names')
  async debugEmptyNames() {
    this.logger.log('Checking for records with empty names in Google Sheets');

    try {
      const sheetsData = await this.sheetsService.getDirectors();
      const emptyNameRecords = sheetsData.filter(
        (record) => !record.Name || record.Name === '' || record.Name === null,
      );

      return {
        success: true,
        totalRecords: sheetsData.length,
        emptyNameRecords: emptyNameRecords.length,
        records: emptyNameRecords.slice(0, 5).map((record) => ({
          rawRecord: record,
          id: record.ID,
          name: record.Name,
          sslId: record['SSL ID'],
          type: record.Type,
        })),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to debug empty names: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private convertSheetToDbFormat(sheetDirector: any): any {
    // Map sheet data to database format
    const dbDirector = {
      sheetId: sheetDirector.ID,
      borrowerId: sheetDirector['Borrower ID'],
      name: sheetDirector.Name,
      nationalIdNumber: sheetDirector['National ID Number'],
      kraPinNumber: sheetDirector['KRA Pin Number'],
      phoneNumber: sheetDirector['Phone Number'],
      email: sheetDirector.Email,
      gender: sheetDirector.Gender,
      roleInSchool: sheetDirector['Role in School'],
      status: sheetDirector.Status,
      dateOfBirth: sheetDirector['Date of Birth'],
      educationLevel: sheetDirector['Education Level'],
      insuredForCreditLife: sheetDirector['Insured for Credit Life?'],
      address: sheetDirector.Address,
      postalAddress: sheetDirector['Postal Address'],
      nationalIdFront: sheetDirector['National ID Front'],
      nationalIdBack: sheetDirector['National ID Back'],
      kraPinPhoto: sheetDirector['KRA Pin Photo'],
      passportPhoto: sheetDirector['Passport Photo'],
      type: sheetDirector.Type,
      // Remove createdAt to let Prisma handle it automatically
    };

    // Remove undefined values to avoid Prisma errors
    const cleanedDirector = {};
    for (const [key, value] of Object.entries(dbDirector)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanedDirector[key] = value;
      }
    }

    return cleanedDirector;
  }

  private convertToFloat(value: any): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // Handle "#VALUE!" and other Excel errors
    if (
      typeof value === 'string' &&
      (value.includes('#') || value.includes('VALUE'))
    ) {
      return null;
    }

    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
}
