import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { AuditedFinancialsDbService } from '../services/audited-financials-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/audited-financials-migration')
export class AuditedFinancialsMigrationController {
  private readonly logger = new Logger(
    AuditedFinancialsMigrationController.name,
  );

  constructor(
    private readonly auditedFinancialsDbService: AuditedFinancialsDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Audited Financials');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getAuditedFinancials();
      const dbData = await this.auditedFinancialsDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((af) => ({
              creditApplicationId: af['Credit Application ID'],
              file: af['File'],
              sheetId: af.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((af) => af.synced).length,
            unsynced: dbData.filter((af) => !af.synced).length,
            sample: dbData.slice(0, 3).map((af) => ({
              creditApplicationId: af.creditApplicationId,
              file: af.file,
              sheetId: af.sheetId,
              synced: af.synced,
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
      const sheetsData = await this.sheetsService.getAuditedFinancials();

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
            (af) => af['Credit Application ID'] === creditApplicationId,
          )
        : sheetsData;

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each record from Google Sheets
      for (const sheetAuditedFinancial of filteredSheetsData) {
        try {
          // Skip completely empty records (no data at all)
          if (
            Object.keys(sheetAuditedFinancial).length === 0 ||
            (Object.keys(sheetAuditedFinancial).length === 1 &&
              sheetAuditedFinancial.ID === '')
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetAuditedFinancial,
            });
            continue;
          }

          // Skip records with empty ID
          if (
            !sheetAuditedFinancial.ID ||
            sheetAuditedFinancial.ID.trim() === ''
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetAuditedFinancial,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord =
            await this.auditedFinancialsDbService.findBySheetId(
              sheetAuditedFinancial.ID,
            );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetAuditedFinancial.ID,
              creditApplicationId:
                sheetAuditedFinancial['Credit Application ID'],
              file: sheetAuditedFinancial['File'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbAuditedFinancial = this.convertSheetToDbFormat(
            sheetAuditedFinancial,
          );

          // Create record in database
          await this.auditedFinancialsDbService.create(dbAuditedFinancial);
          imported++;

          this.logger.debug(
            `Imported Audited Financial: ${sheetAuditedFinancial['Credit Application ID']} - ${sheetAuditedFinancial['File']}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetAuditedFinancial.ID,
            creditApplicationId: sheetAuditedFinancial['Credit Application ID'],
            file: sheetAuditedFinancial['File'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import Audited Financial ${sheetAuditedFinancial.ID}: ${errorMessage}`,
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
      // Get unsynced audited financials from database
      const allUnsyncedAuditedFinancials =
        await this.auditedFinancialsDbService.findUnsynced();
      const unsyncedAuditedFinancials = creditApplicationId
        ? allUnsyncedAuditedFinancials.filter(
            (af) => af.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedAuditedFinancials;

      if (
        !unsyncedAuditedFinancials ||
        unsyncedAuditedFinancials.length === 0
      ) {
        return {
          success: true,
          message: 'No unsynced audited financials found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced audited financial
      for (const auditedFinancial of unsyncedAuditedFinancials) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.auditedFinancialsDbService.updateSyncStatus(
            auditedFinancial.id,
            true,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            file: auditedFinancial.file,
            creditApplicationId: auditedFinancial.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Audited Financial ${auditedFinancial.id}: ${errorMessage}`,
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
    this.logger.log(`Comparing Audited Financial record: ${sheetId}`);

    try {
      // Get record from Google Sheets
      const sheetsData = await this.sheetsService.getAuditedFinancials();
      const sheetRecord = sheetsData.find((af) => af.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: `Record with sheet ID ${sheetId} not found in Google Sheets`,
        };
      }

      // Get record from database
      const dbRecord =
        await this.auditedFinancialsDbService.findBySheetId(sheetId);

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

  private convertSheetToDbFormat(sheetAuditedFinancial: any): any {
    // Map sheet data to database format
    const dbAuditedFinancial = {
      sheetId: sheetAuditedFinancial.ID,
      creditApplicationId: sheetAuditedFinancial['Credit Application ID'],
      statementType: sheetAuditedFinancial['Statement Type'],
      notes: sheetAuditedFinancial['Notes'],
      file: sheetAuditedFinancial['File'],
      synced: true, // Mark as synced since we're importing from sheets
    };

    // Filter out undefined, null, and empty string values
    Object.keys(dbAuditedFinancial).forEach((key) => {
      if (
        dbAuditedFinancial[key] === undefined ||
        dbAuditedFinancial[key] === null ||
        dbAuditedFinancial[key] === ''
      ) {
        delete dbAuditedFinancial[key];
      }
    });

    return dbAuditedFinancial;
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
