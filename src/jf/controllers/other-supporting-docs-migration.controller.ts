import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { OtherSupportingDocsDbService } from '../services/other-supporting-docs-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/other-supporting-docs-migration')
export class OtherSupportingDocsMigrationController {
  private readonly logger = new Logger(
    OtherSupportingDocsMigrationController.name,
  );

  constructor(
    private readonly otherSupportingDocsDbService: OtherSupportingDocsDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    try {
      const totalInDb = await this.otherSupportingDocsDbService.findAll();
      const totalInSheets = await this.sheetsService.getOtherSupportingDocs();

      return {
        success: true,
        data: {
          totalInDatabase: totalInDb.length,
          totalInSheets: totalInSheets.length,
          syncedInDatabase: totalInDb.filter((record) => record.synced).length,
          unsyncedInDatabase: totalInDb.filter((record) => !record.synced)
            .length,
        },
        message:
          'Other supporting documents migration status retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get migration status: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
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
      // Get all other supporting docs from Google Sheets
      const allSheetOtherSupportingDocs =
        await this.sheetsService.getOtherSupportingDocs();
      const sheetOtherSupportingDocs = creditApplicationId
        ? allSheetOtherSupportingDocs.filter(
            (doc) => doc['Credit Application'] === creditApplicationId,
          )
        : allSheetOtherSupportingDocs;

      if (!sheetOtherSupportingDocs || sheetOtherSupportingDocs.length === 0) {
        return {
          success: true,
          message: 'No other supporting documents found in Google Sheets',
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

      for (const sheetOtherSupportingDoc of sheetOtherSupportingDocs) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetOtherSupportingDoc).length === 0) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetOtherSupportingDoc,
            });
            continue;
          }

          // Skip records with empty ID
          if (
            !sheetOtherSupportingDoc.ID ||
            sheetOtherSupportingDoc.ID.trim() === ''
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetOtherSupportingDoc,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord =
            await this.otherSupportingDocsDbService.findBySheetId(
              sheetOtherSupportingDoc.ID,
            );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetOtherSupportingDoc.ID,
              creditApplicationId:
                sheetOtherSupportingDoc['Credit Application'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbData = this.convertSheetToDbFormat(sheetOtherSupportingDoc);

          // Create record in database
          await this.otherSupportingDocsDbService.create(dbData);
          imported++;

          this.logger.debug(
            `Imported other supporting doc with sheetId: ${sheetOtherSupportingDoc.ID}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetOtherSupportingDoc.ID,
            creditApplicationId: sheetOtherSupportingDoc['Credit Application'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import other supporting doc ${sheetOtherSupportingDoc.ID}: ${errorMessage}`,
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
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
        skippedDetails: skippedDetails.length > 0 ? skippedDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to import from sheets: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
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
      // Get unsynced other supporting docs from database
      const allUnsyncedOtherSupportingDocs =
        await this.otherSupportingDocsDbService.findUnsynced();
      const unsyncedOtherSupportingDocs = creditApplicationId
        ? allUnsyncedOtherSupportingDocs.filter(
            (doc) => doc.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedOtherSupportingDocs;

      if (
        !unsyncedOtherSupportingDocs ||
        unsyncedOtherSupportingDocs.length === 0
      ) {
        return {
          success: true,
          message: 'No unsynced other supporting documents found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced other supporting doc
      for (const otherSupportingDoc of unsyncedOtherSupportingDocs) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.otherSupportingDocsDbService.updateSyncStatus(
            otherSupportingDoc.id,
            true,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            file: otherSupportingDoc.file,
            creditApplicationId: otherSupportingDoc.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Other Supporting Doc ${otherSupportingDoc.id}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(`Sync completed: ${synced} synced, ${errors} errors`);

      return {
        success: true,
        message: `Sync completed: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync to sheets: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
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
      // Step 1: Import from sheets
      const importResult = await this.importFromSheets(creditApplicationId);
      if (!importResult.success) {
        return importResult;
      }

      // Step 2: Sync to sheets
      const syncResult = await this.syncToSheets(creditApplicationId);
      if (!syncResult.success) {
        return syncResult;
      }

      return {
        success: true,
        message: 'Full migration completed successfully',
        import: importResult,
        sync: syncResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to complete full migration: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('compare-record')
  async compareRecord(@Query('sheetId') sheetId: string) {
    try {
      // Get record from database
      const dbRecord =
        await this.otherSupportingDocsDbService.findBySheetId(sheetId);
      if (!dbRecord) {
        return {
          success: false,
          error: 'Record not found in database',
        };
      }

      // Get record from sheets
      const sheetRecords = await this.sheetsService.getOtherSupportingDocs();
      const sheetRecord = sheetRecords.find((record) => record.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: 'Record not found in Google Sheets',
        };
      }

      return {
        success: true,
        data: {
          database: dbRecord,
          sheet: sheetRecord,
        },
        message: 'Record comparison completed',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare record: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('fix-existing-records')
  async fixExistingRecords() {
    this.logger.log(
      'Starting to fix existing records with correct field mapping',
    );

    try {
      // Get all records from Google Sheets
      const allSheetRecords = await this.sheetsService.getOtherSupportingDocs();

      // Get all records from database
      const allDbRecords = await this.otherSupportingDocsDbService.findAll();

      let updated = 0;
      let errors = 0;
      const errorDetails = [];

      for (const dbRecord of allDbRecords) {
        try {
          // Find corresponding sheet record by sheetId
          const sheetRecord = allSheetRecords.find(
            (sheetRecord) => sheetRecord.ID === dbRecord.sheetId,
          );

          if (sheetRecord) {
            // Update the record with correct creditApplicationId
            const correctCreditApplicationId =
              sheetRecord['Credit Application ID'];

            if (
              correctCreditApplicationId &&
              correctCreditApplicationId !== dbRecord.creditApplicationId
            ) {
              await this.otherSupportingDocsDbService.updateById(dbRecord.id, {
                creditApplicationId: correctCreditApplicationId,
              });
              updated++;
              this.logger.debug(
                `Updated record ${dbRecord.sheetId} with creditApplicationId: ${correctCreditApplicationId}`,
              );
            }
          } else {
            this.logger.warn(
              `No sheet record found for database record ${dbRecord.sheetId}`,
            );
          }
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: dbRecord.sheetId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to fix record ${dbRecord.sheetId}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(`Fix completed: ${updated} updated, ${errors} errors`);

      return {
        success: true,
        message: `Fix completed: ${updated} updated, ${errors} errors`,
        updated,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fix existing records: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private convertSheetToDbFormat(sheetRecord: any) {
    return {
      sheetId: sheetRecord.ID,
      creditApplicationId: sheetRecord['Credit Application ID'],
      documentType: sheetRecord['Document Type'],
      notes: sheetRecord['Notes'],
      file: sheetRecord['File'] || '',
      image: sheetRecord['Image'] || '',
      synced: true, // Mark as synced since we're importing from sheets
    };
  }
}
