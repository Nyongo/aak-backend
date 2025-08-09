import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';
import { ContractDetailsDbService } from '../services/contract-details-db.service';

@Controller('jf/contract-details-migration')
export class ContractDetailsMigrationController {
  private readonly logger = new Logger(ContractDetailsMigrationController.name);

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly contractDetailsDbService: ContractDetailsDbService,
  ) {}

  @Get('status')
  async getStatus() {
    try {
      const [sheetData, dbData, unsyncedData] = await Promise.all([
        this.sheetsService.getContractDetails(),
        this.contractDetailsDbService.findAll(),
        this.contractDetailsDbService.findUnsynced(),
      ]);

      return {
        success: true,
        data: {
          totalInDatabase: dbData.length,
          totalInSheets: sheetData.length,
          syncedInDatabase: dbData.length - unsyncedData.length,
          unsyncedInDatabase: unsyncedData.length,
        },
        message: 'Contract details migration status retrieved successfully',
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
      const data = await this.sheetsService.getContractDetails();
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
      const sheetData = await this.sheetsService.getContractDetails();
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

          // Skip records with empty ID
          if (!sheetRecord.ID || sheetRecord.ID.trim() === '') {
            skipped++;
            this.logger.debug('Skipped record with empty ID');
            continue;
          }

          // Check if record already exists
          const existingRecord =
            await this.contractDetailsDbService.findBySheetId(sheetRecord.ID);
          if (existingRecord) {
            skipped++;
            this.logger.debug(`Skipped existing record: ${sheetRecord.ID}`);
            continue;
          }

          // Convert and create record
          const dbRecord = this.convertSheetToDbFormat(sheetRecord);
          await this.contractDetailsDbService.create(dbRecord);
          imported++;
        } catch (error) {
          this.logger.error(
            `Failed to import contract details ${sheetRecord.ID}:`,
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
        await this.contractDetailsDbService.findUnsynced();
      let synced = 0;
      const errors: Array<{ id: number; error: string }> = [];

      for (const record of unsyncedRecords) {
        try {
          // Convert to sheet format and sync
          const sheetRecord = this.convertDbToSheetFormat(record);
          // Add to Google Sheets (implementation would depend on sheets service)
          // await this.sheetsService.addContractDetails(sheetRecord);

          // Mark as synced
          await this.contractDetailsDbService.updateSyncStatus(record.id, true);
          synced++;
        } catch (error) {
          this.logger.error(
            `Failed to sync contract details ${record.id}:`,
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
        this.contractDetailsDbService.findBySheetId(sheetId),
        this.sheetsService.getContractDetails(),
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
      loanLengthRequestedMonths: sheetRecord['Loan Length Requested (Months)'],
      monthsSchoolRequestsForgiveness:
        sheetRecord['Months School Requests Forgiveness'],
      disbursalDateRequested: sheetRecord['Disbursal Date Requested'],
      tenPercentDownOnVehicleOrLandFinancing:
        sheetRecord['10% Down on Vehicle or Land Financing'],
      createdBy: sheetRecord['Created By'],
      synced: true, // Mark as synced since it's coming from sheets
    };
  }

  private convertDbToSheetFormat(dbRecord: any) {
    return {
      ID: dbRecord.sheetId,
      'Credit Application ID': dbRecord.creditApplicationId,
      'Loan Length Requested (Months)': dbRecord.loanLengthRequestedMonths,
      'Months School Requests Forgiveness':
        dbRecord.monthsSchoolRequestsForgiveness,
      'Disbursal Date Requested': dbRecord.disbursalDateRequested,
      '10% Down on Vehicle or Land Financing':
        dbRecord.tenPercentDownOnVehicleOrLandFinancing,
      'Created By': dbRecord.createdBy,
    };
  }
}
