import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';
import { HomeVisitDbService } from '../services/home-visit-db.service';
import { HomeVisitSyncService } from '../services/home-visit-sync.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { CreateHomeVisitDto } from '../dto/create-home-visit.dto';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/home-visits')
export class HomeVisitController {
  private readonly logger = new Logger(HomeVisitController.name);
  private readonly SHEET_NAME = 'Home Visits';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly homeVisitDbService: HomeVisitDbService,
    private readonly homeVisitSyncService: HomeVisitSyncService,
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}

  @Post()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createHomeVisit(@Body() createDto: CreateHomeVisitDto) {
    try {
      this.logger.log('Creating home visit record');

      // Generate unique ID for the home visit
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 8);
      const id = `HV-${timestamp}-${random}`;

      // Create record in database
      const dbData = {
        sheetId: id,
        creditApplicationId: createDto['Credit Application ID'],
        userId: createDto['User ID'],
        county: createDto.County || '',
        addressDetails: createDto['Address Details '] || '',
        locationPin: createDto['Location Pin'] || '',
        ownOrRent: createDto['Own or Rent'] || '',
        howManyYearsStayed:
          createDto['How many years have they stayed there?'] || '',
        maritalStatus: createDto['Marital Status'] || '',
        howManyChildren:
          createDto['How many children does the director have?'] || '',
        isSpouseInvolvedInSchool:
          createDto['Is the spouse involved in running school?'] || '',
        doesSpouseHaveOtherIncome:
          createDto['Does the spouse have other income?'] || '',
        ifYesHowMuchPerMonth: createDto['If yes, how much per month? '] || '',
        isDirectorBehindOnUtilityBills:
          createDto['Is the director behind on any utility bills at home? '] ||
          '',
        totalNumberOfRooms:
          createDto[
            'What is the total number of rooms in house? (Include all types of rooms) '
          ] || '',
        howIsNeighborhood:
          createDto['How is the neighborhood? Provide general comments.'] || '',
        howAccessibleIsHouse:
          createDto[
            'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? '
          ] || '',
        isDirectorHomeInSameCity:
          createDto[
            "Is the director's home in the same city as their school? "
          ] || '',
        isDirectorTrainedEducator:
          createDto['Is the director a trained educator?'] || '',
        doesDirectorHaveOtherBusiness:
          createDto['Does the director have another profitable business?'] ||
          '',
        otherNotes: createDto['Other Notes'] || '',
      };

      const createdRecord = await this.homeVisitDbService.create(dbData);
      this.logger.log(
        `Created record in database with ID: ${createdRecord.id}`,
      );

      // Trigger background sync
      await this.triggerBackgroundSync(
        createdRecord.id,
        createDto['Credit Application ID'],
        'create',
      );

      return {
        success: true,
        message: 'Home visit record created successfully',
        data: {
          id: createdRecord.id,
          sheetId: createdRecord.sheetId,
          ...dbData,
        },
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating home visit record: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getHomeVisitsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Fetching home visits for credit application: ${creditApplicationId}`,
      );

      const records =
        await this.homeVisitDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (!records || records.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Convert database records to original sheet format for frontend compatibility
      const recordsWithOriginalKeys = records.map((record) => {
        const convertedRecord =
          this.homeVisitDbService.convertDbDataToSheet(record);

        // Add additional fields that might not be in the mapping
        convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
        convertedRecord['Synced'] = record.synced || false;

        return convertedRecord;
      });

      return {
        success: true,
        count: recordsWithOriginalKeys.length,
        data: recordsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching home visits for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getHomeVisitById(@Param('id') id: string) {
    try {
      const record = await this.homeVisitDbService.findById(id);
      if (!record) {
        return { success: false, message: 'Home visit not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const convertedRecord =
        this.homeVisitDbService.convertDbDataToSheet(record);

      // Add additional fields that might not be in the mapping
      convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
      convertedRecord['Synced'] = record.synced || false;

      return { success: true, data: convertedRecord };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching home visit ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Get()
  async getAllHomeVisits() {
    try {
      const records = await this.homeVisitDbService.findAll();

      if (!records || records.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Convert database records to original sheet format for frontend compatibility
      const recordsWithOriginalKeys = records.map((record) => {
        const convertedRecord =
          this.homeVisitDbService.convertDbDataToSheet(record);

        // Add additional fields that might not be in the mapping
        convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
        convertedRecord['Synced'] = record.synced || false;

        return convertedRecord;
      });

      return {
        success: true,
        count: recordsWithOriginalKeys.length,
        data: recordsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all home visits: ${apiError.message}`);
      throw error;
    }
  }

  @Put(':id')
  async updateHomeVisit(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateHomeVisitDto>,
  ) {
    try {
      this.logger.log(`Updating home visit with ID: ${id}`);

      // Find existing record by sheetId
      const existingRecord = await this.homeVisitDbService.findBySheetId(id);
      if (!existingRecord) {
        return { success: false, message: 'Home visit not found' };
      }

      // Prepare update data with only provided fields
      const updateData: any = {};
      if (updateDto['Credit Application ID'] !== undefined) {
        updateData.creditApplicationId = updateDto['Credit Application ID'];
      }
      if (updateDto['User ID'] !== undefined) {
        updateData.userId = updateDto['User ID'];
      }
      if (updateDto.County !== undefined) {
        updateData.county = updateDto.County;
      }
      if (updateDto['Address Details '] !== undefined) {
        updateData.addressDetails = updateDto['Address Details '];
      }
      if (updateDto['Location Pin'] !== undefined) {
        updateData.locationPin = updateDto['Location Pin'];
      }
      if (updateDto['Own or Rent'] !== undefined) {
        updateData.ownOrRent = updateDto['Own or Rent'];
      }
      if (updateDto['How many years have they stayed there?'] !== undefined) {
        updateData.howManyYearsStayed =
          updateDto['How many years have they stayed there?'];
      }
      if (updateDto['Marital Status'] !== undefined) {
        updateData.maritalStatus = updateDto['Marital Status'];
      }
      if (
        updateDto['How many children does the director have?'] !== undefined
      ) {
        updateData.howManyChildren =
          updateDto['How many children does the director have?'];
      }
      if (
        updateDto['Is the spouse involved in running school?'] !== undefined
      ) {
        updateData.isSpouseInvolvedInSchool =
          updateDto['Is the spouse involved in running school?'];
      }
      if (updateDto['Does the spouse have other income?'] !== undefined) {
        updateData.doesSpouseHaveOtherIncome =
          updateDto['Does the spouse have other income?'];
      }
      if (updateDto['If yes, how much per month? '] !== undefined) {
        updateData.ifYesHowMuchPerMonth =
          updateDto['If yes, how much per month? '];
      }
      if (
        updateDto['Is the director behind on any utility bills at home? '] !==
        undefined
      ) {
        updateData.isDirectorBehindOnUtilityBills =
          updateDto['Is the director behind on any utility bills at home? '];
      }
      if (
        updateDto[
          'What is the total number of rooms in house? (Include all types of rooms) '
        ] !== undefined
      ) {
        updateData.totalNumberOfRooms =
          updateDto[
            'What is the total number of rooms in house? (Include all types of rooms) '
          ];
      }
      if (
        updateDto['How is the neighborhood? Provide general comments.'] !==
        undefined
      ) {
        updateData.howIsNeighborhood =
          updateDto['How is the neighborhood? Provide general comments.'];
      }
      if (
        updateDto[
          'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? '
        ] !== undefined
      ) {
        updateData.howAccessibleIsHouse =
          updateDto[
            'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? '
          ];
      }
      if (
        updateDto[
          "Is the director's home in the same city as their school? "
        ] !== undefined
      ) {
        updateData.isDirectorHomeInSameCity =
          updateDto[
            "Is the director's home in the same city as their school? "
          ];
      }
      if (updateDto['Is the director a trained educator?'] !== undefined) {
        updateData.isDirectorTrainedEducator =
          updateDto['Is the director a trained educator?'];
      }
      if (
        updateDto['Does the director have another profitable business?'] !==
        undefined
      ) {
        updateData.doesDirectorHaveOtherBusiness =
          updateDto['Does the director have another profitable business?'];
      }
      if (updateDto['Other Notes'] !== undefined) {
        updateData.otherNotes = updateDto['Other Notes'];
      }

      // Update record in database
      const updatedRecord = await this.homeVisitDbService.updateById(
        existingRecord.id,
        updateData,
      );
      this.logger.log(
        `Updated record in database with ID: ${updatedRecord.id}`,
      );

      // Trigger background sync
      await this.triggerBackgroundSync(
        updatedRecord.id,
        updatedRecord.creditApplicationId,
        'update',
      );

      // Convert to sheet format for response
      const convertedRecord =
        this.homeVisitDbService.convertDbDataToSheet(updatedRecord);
      convertedRecord['Created At'] =
        updatedRecord.createdAt?.toISOString() || '';
      convertedRecord['Synced'] = updatedRecord.synced || false;

      return {
        success: true,
        message: 'Home visit updated successfully',
        data: convertedRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating home visit: ${apiError.message}`);
      throw error;
    }
  }

  @Delete(':id')
  async deleteHomeVisit(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting home visit with ID: ${id}`);

      // Find existing record by sheetId
      const existingRecord = await this.homeVisitDbService.findBySheetId(id);
      if (!existingRecord) {
        return { success: false, message: 'Home visit not found' };
      }

      // Delete from Google Sheets if sheetId is not temporary
      if (existingRecord.sheetId && !existingRecord.sheetId.startsWith('HV-')) {
        try {
          await this.sheetsService.deleteRow(this.SHEET_NAME, id);
          this.logger.log(`Deleted from Google Sheets: ${id}`);
        } catch (sheetsError: any) {
          this.logger.error(
            `Error deleting from Google Sheets: ${sheetsError.message}`,
          );
        }
      }

      // Delete from database
      await this.homeVisitDbService.delete(existingRecord.id.toString());

      return {
        success: true,
        message: 'Home visit deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error deleting home visit: ${apiError.message}`);
      throw error;
    }
  }

  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for home visit ${dbId} (${operation})`,
      );

      // Trigger sync in the background
      setTimeout(async () => {
        try {
          await this.homeVisitSyncService.syncHomeVisitById(dbId, operation);
          this.logger.log(`Background sync completed for home visit ${dbId}`);
        } catch (error) {
          this.logger.error(
            `Background sync failed for home visit ${dbId}:`,
            error,
          );
        }
      }, 1000);
    } catch (error) {
      this.logger.error(
        `Error triggering background sync for home visit ${dbId}:`,
        error,
      );
    }
  }

  @Post('sync/:id')
  async syncHomeVisitById(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync triggered for home visit: ${id}`);
      const result = await this.homeVisitSyncService.syncHomeVisitById(
        parseInt(id),
      );
      return {
        success: true,
        message: `Successfully synced home visit ${id}`,
        data: result,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error syncing home visit ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Post('sync-all')
  async syncAllHomeVisits() {
    try {
      this.logger.log('Manual sync all home visits triggered');
      const result = await this.homeVisitSyncService.syncAllToSheets();
      return {
        success: true,
        message: 'Successfully synced all home visits',
        data: result,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error syncing all home visits: ${apiError.message}`);
      throw error;
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncHomeVisitsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync triggered for home visits by application: ${creditApplicationId}`,
      );
      const result =
        await this.homeVisitSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return {
        success: true,
        message: `Successfully synced home visits for application ${creditApplicationId}`,
        data: result,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error syncing home visits for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }
}
