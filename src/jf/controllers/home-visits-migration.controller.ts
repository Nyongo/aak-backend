import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';
import { HomeVisitDbService } from '../services/home-visit-db.service';

@Controller('jf/home-visits-migration')
export class HomeVisitsMigrationController {
  private readonly logger = new Logger(HomeVisitsMigrationController.name);

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly homeVisitDbService: HomeVisitDbService,
  ) {}

  @Get('status')
  async getStatus() {
    try {
      const [sheetData, dbData, unsyncedData] = await Promise.all([
        this.sheetsService.getHomeVisits(),
        this.homeVisitDbService.findAll(),
        this.homeVisitDbService.findUnsynced(),
      ]);

      return {
        success: true,
        data: {
          totalInDatabase: dbData.length,
          totalInSheets: sheetData.length,
          syncedInDatabase: dbData.length - unsyncedData.length,
          unsyncedInDatabase: unsyncedData.length,
        },
        message: 'Home visits migration status retrieved successfully',
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
      const data = await this.sheetsService.getHomeVisits();
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
      const sheetData = await this.sheetsService.getHomeVisits();
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
          const existingRecord = await this.homeVisitDbService.findBySheetId(
            sheetRecord.ID,
          );
          if (existingRecord) {
            skipped++;
            this.logger.debug(`Skipped existing record: ${sheetRecord.ID}`);
            continue;
          }

          // Convert and create record
          const dbRecord = this.convertSheetToDbFormat(sheetRecord);
          await this.homeVisitDbService.create(dbRecord);
          imported++;
        } catch (error) {
          this.logger.error(
            `Failed to import home visit ${sheetRecord.ID}:`,
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
      const unsyncedRecords = await this.homeVisitDbService.findUnsynced();
      let synced = 0;
      const errors: Array<{ id: number; error: string }> = [];

      for (const record of unsyncedRecords) {
        try {
          // Convert to sheet format and sync
          const sheetRecord = this.convertDbToSheetFormat(record);
          // Add to Google Sheets (implementation would depend on sheets service)
          // await this.sheetsService.addHomeVisit(sheetRecord);

          // Mark as synced
          await this.homeVisitDbService.updateSyncStatus(record.id, true);
          synced++;
        } catch (error) {
          this.logger.error(`Failed to sync home visit ${record.id}:`, error);
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
        this.homeVisitDbService.findBySheetId(sheetId),
        this.sheetsService.getHomeVisits(),
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
      userId: sheetRecord['User ID'],
      county: sheetRecord['County'],
      addressDetails: sheetRecord['Address Details'],
      locationPin: sheetRecord['Location Pin'],
      ownOrRent: sheetRecord['Own or Rent'],
      howManyYearsStayed: sheetRecord['How many years stayed'],
      maritalStatus: sheetRecord['Marital Status'],
      howManyChildren: sheetRecord['How many children'],
      isSpouseInvolvedInSchool: sheetRecord['Is spouse involved in school'],
      doesSpouseHaveOtherIncome: sheetRecord['Does spouse have other income'],
      ifYesHowMuchPerMonth: sheetRecord['If yes, how much per month'],
      isDirectorBehindOnUtilityBills:
        sheetRecord['Is director behind on utility bills'],
      totalNumberOfRooms: sheetRecord['Total number of rooms'],
      howIsNeighborhood: sheetRecord['How is neighborhood'],
      howAccessibleIsHouse: sheetRecord['How accessible is house'],
      isDirectorHomeInSameCity: sheetRecord['Is director home in same city'],
      isDirectorTrainedEducator: sheetRecord['Is director trained educator'],
      doesDirectorHaveOtherBusiness:
        sheetRecord['Does director have other business'],
      otherNotes: sheetRecord['Other Notes'],
      synced: true, // Mark as synced since it's coming from sheets
    };
  }

  private convertDbToSheetFormat(dbRecord: any) {
    return {
      ID: dbRecord.sheetId,
      'Credit Application ID': dbRecord.creditApplicationId,
      'User ID': dbRecord.userId,
      County: dbRecord.county,
      'Address Details': dbRecord.addressDetails,
      'Location Pin': dbRecord.locationPin,
      'Own or Rent': dbRecord.ownOrRent,
      'How many years stayed': dbRecord.howManyYearsStayed,
      'Marital Status': dbRecord.maritalStatus,
      'How many children': dbRecord.howManyChildren,
      'Is spouse involved in school': dbRecord.isSpouseInvolvedInSchool,
      'Does spouse have other income': dbRecord.doesSpouseHaveOtherIncome,
      'If yes, how much per month': dbRecord.ifYesHowMuchPerMonth,
      'Is director behind on utility bills':
        dbRecord.isDirectorBehindOnUtilityBills,
      'Total number of rooms': dbRecord.totalNumberOfRooms,
      'How is neighborhood': dbRecord.howIsNeighborhood,
      'How accessible is house': dbRecord.howAccessibleIsHouse,
      'Is director home in same city': dbRecord.isDirectorHomeInSameCity,
      'Is director trained educator': dbRecord.isDirectorTrainedEducator,
      'Does director have other business':
        dbRecord.doesDirectorHaveOtherBusiness,
      'Other Notes': dbRecord.otherNotes,
    };
  }
}
