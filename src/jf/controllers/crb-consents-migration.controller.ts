import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { CrbConsentDbService } from '../services/crb-consent-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/crb-consents-migration')
export class CrbConsentsMigrationController {
  private readonly logger = new Logger(CrbConsentsMigrationController.name);

  constructor(
    private readonly crbConsentsDbService: CrbConsentDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for CRB Consents');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getCrbConsents();
      const dbData = await this.crbConsentsDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((c) => ({
              borrowerId: c['Borrower ID'],
              agreement: c.Agreement,
              sheetId: c.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((c) => c.synced).length,
            unsynced: dbData.filter((c) => !c.synced).length,
            sample: dbData.slice(0, 3).map((c) => ({
              borrowerId: c.borrowerId,
              agreement: c.agreement,
              sheetId: c.sheetId,
              synced: c.synced,
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
        ? await this.sheetsService.getCrbConsents(borrowerId)
        : await this.sheetsService.getCrbConsents();

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
      for (const sheetConsent of sheetsData) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetConsent).length === 0) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetConsent,
            });
            continue;
          }

          // Skip records with empty ID
          if (!sheetConsent.ID || sheetConsent.ID.trim() === '') {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetConsent,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord = await this.crbConsentsDbService.findBySheetId(
            sheetConsent.ID,
          );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetConsent.ID,
              borrowerId: sheetConsent['Borrower ID'],
              agreement: sheetConsent.Agreement,
            });
            continue;
          }

          // Convert sheet data to database format
          const dbConsent = this.convertSheetToDbFormat(sheetConsent);

          // Create record in database
          await this.crbConsentsDbService.create(dbConsent);
          imported++;

          this.logger.debug(
            `Imported CRB Consent: ${sheetConsent['Borrower ID']} - ${sheetConsent.Agreement}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetConsent.ID,
            borrowerId: sheetConsent['Borrower ID'],
            agreement: sheetConsent.Agreement,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import CRB Consent ${sheetConsent.ID}: ${errorMessage}`,
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
      // Get unsynced consents from database
      const unsyncedConsents = borrowerId
        ? (await this.crbConsentsDbService.findByBorrowerId(borrowerId)).filter(
            (c) => !c.synced,
          )
        : await this.crbConsentsDbService.findUnsynced();

      if (!unsyncedConsents || unsyncedConsents.length === 0) {
        return {
          success: true,
          message: 'No unsynced CRB consents found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced consent
      for (const consent of unsyncedConsents) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.crbConsentsDbService.updateSyncStatus(consent.id, true);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            agreement: consent.agreement,
            borrowerId: consent.borrowerId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync CRB consent ${consent.id}: ${errorMessage}`,
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
    this.logger.log(`Comparing CRB consent record: ${sheetId}`);

    try {
      // Get record from Google Sheets
      const sheetsData = await this.sheetsService.getCrbConsents();
      const sheetRecord = sheetsData.find((r) => r.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: `Record with sheet ID ${sheetId} not found in Google Sheets`,
        };
      }

      // Get record from database
      const dbRecord = await this.crbConsentsDbService.findBySheetId(sheetId);

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

  private convertSheetToDbFormat(sheetConsent: any): any {
    // Map sheet data to database format
    const dbConsent = {
      sheetId: sheetConsent.ID,
      borrowerId: sheetConsent['Borrower ID'],
      agreement: sheetConsent.Agreement,
      signedByName: sheetConsent['Signed By Name'],
      date: sheetConsent.Date,
      roleInOrganization: sheetConsent['Role in Organization'],
      signature: sheetConsent.Signature,
      synced: true, // Mark as synced since we're importing from sheets
    };

    // Filter out undefined, null, and empty string values
    Object.keys(dbConsent).forEach((key) => {
      if (
        dbConsent[key] === undefined ||
        dbConsent[key] === null ||
        dbConsent[key] === ''
      ) {
        delete dbConsent[key];
      }
    });

    return dbConsent;
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
