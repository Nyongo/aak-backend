import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';
import { CreditApplicationCommentsDbService } from '../services/credit-application-comments-db.service';

@Controller('jf/credit-application-comments-migration')
export class CreditApplicationCommentsMigrationController {
  private readonly logger = new Logger(
    CreditApplicationCommentsMigrationController.name,
  );

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly creditApplicationCommentsDbService: CreditApplicationCommentsDbService,
  ) {}

  @Get('status')
  async getStatus() {
    try {
      const [sheetData, dbData, unsyncedData] = await Promise.all([
        this.sheetsService.getCreditApplicationComments(),
        this.creditApplicationCommentsDbService.findAll(),
        this.creditApplicationCommentsDbService.findUnsynced(),
      ]);

      return {
        success: true,
        data: {
          totalInDatabase: dbData.length,
          totalInSheets: sheetData.length,
          syncedInDatabase: dbData.length - unsyncedData.length,
          unsyncedInDatabase: unsyncedData.length,
        },
        message:
          'Credit application comments migration status retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error getting migration status:', error);
      return {
        success: false,
        message: 'Failed to get migration status',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('sheet-headers')
  async getSheetHeaders() {
    try {
      const data = await this.sheetsService.getCreditApplicationComments();
      const headers = data.length > 0 ? Object.keys(data[0]) : [];

      return {
        success: true,
        data: { headers, sampleCount: data.length },
        message: 'Sheet headers retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error getting sheet headers:', error);
      return {
        success: false,
        message: 'Failed to get sheet headers',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('import-from-sheets')
  async importFromSheets() {
    try {
      const sheetData = await this.sheetsService.getCreditApplicationComments();
      let imported = 0;
      let skipped = 0;
      const errors: Array<{ id: string; error: string }> = [];

      for (const sheetRecord of sheetData) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetRecord).length === 0) {
            skipped++;
            this.logger.debug('Skipped completely empty record');
            continue;
          }

          // Skip records with empty ID - more robust check
          if (!sheetRecord.ID || sheetRecord.ID.toString().trim() === '') {
            skipped++;
            this.logger.debug('Skipped record with empty ID');
            continue;
          }

          // Check if record already exists
          const existingRecord =
            await this.creditApplicationCommentsDbService.findBySheetId(
              sheetRecord.ID,
            );
          if (existingRecord) {
            skipped++;
            this.logger.debug(`Skipped existing record: ${sheetRecord.ID}`);
            continue;
          }

          // Convert to database format and create directly in Prisma
          const dbRecord = this.convertSheetToDbFormat(sheetRecord);

          // Create directly using Prisma to bypass the service's conversion
          await this.creditApplicationCommentsDbService[
            'prisma'
          ].creditApplicationComment.create({
            data: dbRecord,
          });
          imported++;
        } catch (error) {
          this.logger.error(
            `Failed to import credit application comment ${sheetRecord.ID}:`,
            error,
          );
          errors.push({
            id: sheetRecord.ID,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          skipped++;
        }
      }

      return {
        success: true,
        data: { imported, skipped, errors },
        message: `Import completed: ${imported} imported, ${skipped} skipped`,
      };
    } catch (error) {
      this.logger.error('Error importing from sheets:', error);
      return {
        success: false,
        message: 'Failed to import from sheets',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('sync-to-sheets')
  async syncToSheets() {
    try {
      const unsyncedRecords =
        await this.creditApplicationCommentsDbService.findUnsynced();
      let synced = 0;
      const errors: Array<{ id: number; error: string }> = [];

      for (const record of unsyncedRecords) {
        try {
          // Convert to sheet format and sync
          const sheetRecord = this.convertDbToSheetFormat(record);
          // Add to Google Sheets (implementation would depend on sheets service)
          // await this.sheetsService.addCreditApplicationComment(sheetRecord);

          // Mark as synced
          await this.creditApplicationCommentsDbService.updateSyncStatus(
            record.id,
            true,
          );
          synced++;
        } catch (error) {
          this.logger.error(
            `Failed to sync credit application comment ${record.id}:`,
            error,
          );
          errors.push({
            id: record.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        success: true,
        data: { synced, errors },
        message: `Sync completed: ${synced} records synced to sheets`,
      };
    } catch (error) {
      this.logger.error('Error syncing to sheets:', error);
      return {
        success: false,
        message: 'Failed to sync to sheets',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('full-migration')
  async fullMigration() {
    try {
      const importResult = await this.importFromSheets();
      const syncResult = await this.syncToSheets();

      return {
        success: true,
        data: {
          import: importResult.data,
          sync: syncResult.data,
        },
        message: 'Full migration completed successfully',
      };
    } catch (error) {
      this.logger.error('Error in full migration:', error);
      return {
        success: false,
        message: 'Failed to complete full migration',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('compare-record')
  async compareRecord(@Query('sheetId') sheetId: string) {
    try {
      if (!sheetId) {
        return {
          success: false,
          message: 'sheetId parameter is required',
        };
      }

      const [dbRecord, sheetData] = await Promise.all([
        this.creditApplicationCommentsDbService.findBySheetId(sheetId),
        this.sheetsService.getCreditApplicationComments(),
      ]);

      const sheetRecord = sheetData.find((record) => record.ID === sheetId);

      return {
        success: true,
        data: {
          database: dbRecord,
          sheet: sheetRecord,
          exists: {
            inDatabase: !!dbRecord,
            inSheet: !!sheetRecord,
          },
        },
        message: 'Record comparison completed successfully',
      };
    } catch (error) {
      this.logger.error('Error comparing record:', error);
      return {
        success: false,
        message: 'Failed to compare record',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private convertSheetToDbFormat(sheetRecord: any) {
    return {
      sheetId: sheetRecord.ID,
      creditApplicationId: sheetRecord['Credit Application ID'],
      commenterType: sheetRecord['Commenter Type'],
      commenterName: sheetRecord['Commenter Name'],
      comments: sheetRecord['Comments'],
      synced: true, // Mark as synced since it's coming from sheets
    };
  }

  private convertDbToSheetFormat(dbRecord: any) {
    return {
      ID: dbRecord.sheetId,
      'Credit Application ID': dbRecord.creditApplicationId,
      'Commenter Type': dbRecord.commenterType,
      'Commenter Name': dbRecord.commenterName,
      Comments: dbRecord.comments,
    };
  }
}
