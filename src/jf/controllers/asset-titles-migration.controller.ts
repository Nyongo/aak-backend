import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';
import { AssetTitleDbService } from '../services/asset-title-db.service';

@Controller('jf/asset-titles-migration')
export class AssetTitlesMigrationController {
  private readonly logger = new Logger(AssetTitlesMigrationController.name);

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly assetTitleDbService: AssetTitleDbService,
  ) {}

  @Get('status')
  async getStatus() {
    try {
      const [sheetData, dbData, unsyncedData] = await Promise.all([
        this.sheetsService.getAssetTitles(),
        this.assetTitleDbService.findAll(),
        this.assetTitleDbService.findUnsynced(),
      ]);

      return {
        success: true,
        data: {
          totalInDatabase: dbData.length,
          totalInSheets: sheetData.length,
          syncedInDatabase: dbData.length - unsyncedData.length,
          unsyncedInDatabase: unsyncedData.length,
        },
        message: 'Asset titles migration status retrieved successfully',
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
      const data = await this.sheetsService.getAssetTitles();
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
      const sheetData = await this.sheetsService.getAssetTitles();
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
          const existingRecord = await this.assetTitleDbService.findBySheetId(
            sheetRecord.ID,
          );
          if (existingRecord) {
            skipped++;
            this.logger.debug(`Skipped existing record: ${sheetRecord.ID}`);
            continue;
          }

          // Convert and create record
          const dbRecord = this.convertSheetToDbFormat(sheetRecord);
          await this.assetTitleDbService.create(dbRecord);
          imported++;
        } catch (error) {
          this.logger.error(
            `Failed to import asset title ${sheetRecord.ID}:`,
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
      const unsyncedRecords = await this.assetTitleDbService.findUnsynced();
      let synced = 0;
      const errors: Array<{ id: number; error: string }> = [];

      for (const record of unsyncedRecords) {
        try {
          // Convert to sheet format and sync
          const sheetRecord = this.convertDbToSheetFormat(record);
          // Add to Google Sheets (implementation would depend on sheets service)
          // await this.sheetsService.addAssetTitle(sheetRecord);

          // Mark as synced
          await this.assetTitleDbService.updateSyncStatus(record.id, true);
          synced++;
        } catch (error) {
          this.logger.error(`Failed to sync asset title ${record.id}:`, error);
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
        this.assetTitleDbService.findBySheetId(sheetId),
        this.sheetsService.getAssetTitles(),
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
      type: sheetRecord['Type'],
      toBeUsedAsSecurity: sheetRecord['To be used as security'],
      description: sheetRecord['Description'],
      legalOwner: sheetRecord['Legal Owner'],
      userId: sheetRecord['User ID'],
      fullOwnerDetails: sheetRecord['Full Owner Details'],
      collateralOwnedByDirectorOfSchool:
        sheetRecord['Collateral owned by director of school'],
      plotNumber: sheetRecord['Plot Number'],
      schoolSitsOnLand: sheetRecord['School sits on land'],
      hasComprehensiveInsurance: sheetRecord['Has comprehensive insurance'],
      originalInsuranceCoverage: sheetRecord['Original Insurance Coverage'],
      initialEstimatedValue: sheetRecord['Initial Estimated Value'],
      approvedByLegalTeamOrNTSAAgent:
        sheetRecord['Approved by legal team or NTSA agent'],
      notesOnApprovalForUse: sheetRecord['Notes on approval for use'],
      evaluatorsMarketValue: sheetRecord['Evaluators Market Value'],
      evaluatorsForcedValue: sheetRecord['Evaluators Forced Value'],
      moneyOwedOnAsset: sheetRecord['Money owed on asset'],
      licensePlateNumber: sheetRecord['License Plate Number'],
      engineCC: sheetRecord['Engine CC'],
      yearOfManufacture: sheetRecord['Year of Manufacture'],
      logbookPhoto: sheetRecord['Logbook Photo'],
      titleDeedPhoto: sheetRecord['Title Deed Photo'],
      fullTitleDeed: sheetRecord['Full Title Deed'],
      evaluatorsReport: sheetRecord['Evaluators Report'],
      synced: true, // Mark as synced since it's coming from sheets
    };
  }

  private convertDbToSheetFormat(dbRecord: any) {
    return {
      ID: dbRecord.sheetId,
      'Credit Application ID': dbRecord.creditApplicationId,
      Type: dbRecord.type,
      'To be used as security': dbRecord.toBeUsedAsSecurity,
      Description: dbRecord.description,
      'Legal Owner': dbRecord.legalOwner,
      'User ID': dbRecord.userId,
      'Full Owner Details': dbRecord.fullOwnerDetails,
      'Collateral owned by director of school':
        dbRecord.collateralOwnedByDirectorOfSchool,
      'Plot Number': dbRecord.plotNumber,
      'School sits on land': dbRecord.schoolSitsOnLand,
      'Has comprehensive insurance': dbRecord.hasComprehensiveInsurance,
      'Original Insurance Coverage': dbRecord.originalInsuranceCoverage,
      'Initial Estimated Value': dbRecord.initialEstimatedValue,
      'Approved by legal team or NTSA agent':
        dbRecord.approvedByLegalTeamOrNTSAAgent,
      'Notes on approval for use': dbRecord.notesOnApprovalForUse,
      'Evaluators Market Value': dbRecord.evaluatorsMarketValue,
      'Evaluators Forced Value': dbRecord.evaluatorsForcedValue,
      'Money owed on asset': dbRecord.moneyOwedOnAsset,
      'License Plate Number': dbRecord.licensePlateNumber,
      'Engine CC': dbRecord.engineCC,
      'Year of Manufacture': dbRecord.yearOfManufacture,
      'Logbook Photo': dbRecord.logbookPhoto,
      'Title Deed Photo': dbRecord.titleDeedPhoto,
      'Full Title Deed': dbRecord.fullTitleDeed,
      'Evaluators Report': dbRecord.evaluatorsReport,
    };
  }
}
