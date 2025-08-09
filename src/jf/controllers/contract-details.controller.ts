import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  Put,
  Delete,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { ContractDetailsDbService } from '../services/contract-details-db.service';
import { ContractDetailsSyncService } from '../services/contract-details-sync.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { CreateContractDetailsDto } from '../dto/create-contract-details.dto';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/contract-details')
export class ContractDetailsController {
  private readonly logger = new Logger(ContractDetailsController.name);
  private readonly SHEET_NAME = 'Contract Details';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly contractDetailsDbService: ContractDetailsDbService,
    private readonly contractDetailsSyncService: ContractDetailsSyncService,
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}

  @Post()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields for file uploads
      transform: true,
    }),
  )
  async createContractDetails(@Body() createDto: CreateContractDetailsDto) {
    try {
      this.logger.log('Creating contract details record');

      // Generate unique ID for the contract details
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 8);
      const id = `CD-${timestamp}-${random}`;

      // Create record in database
      const dbData = {
        sheetId: id,
        creditApplicationId: createDto['Credit Application ID'],
        loanLengthRequestedMonths:
          createDto['Loan Length Requested (Months)']?.toString() || '',
        monthsSchoolRequestsForgiveness:
          createDto['Months the School Requests Forgiveness']?.toString() || '',
        disbursalDateRequested: createDto['Disbursal Date Requested'] || '',
        tenPercentDownOnVehicleOrLandFinancing:
          createDto['10% Down on Vehicle or Land Financing?'] || '',
        createdBy: createDto['Created By'] || '',
      };

      const createdRecord = await this.contractDetailsDbService.create(dbData);
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
        message: 'Contract details record created successfully',
        data: {
          id: createdRecord.id,
          sheetId: createdRecord.sheetId,
          ...dbData,
        },
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating contract details record: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getContractDetailsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Fetching contract details for credit application: ${creditApplicationId}`,
      );

      const records =
        await this.contractDetailsDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (!records || records.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Convert database records to original sheet format for frontend compatibility
      const recordsWithOriginalKeys = records.map((record) => {
        const convertedRecord =
          this.contractDetailsDbService.convertDbDataToSheet(record);

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
        `Error fetching contract details for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getContractDetailsById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching contract details by ID: ${id}`);

      const record = await this.contractDetailsDbService.findBySheetId(id);
      if (!record) {
        return { success: false, message: 'Contract details not found' };
      }

      // Convert to original sheet format
      const convertedRecord =
        this.contractDetailsDbService.convertDbDataToSheet(record);
      convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
      convertedRecord['Synced'] = record.synced || false;

      return {
        success: true,
        data: convertedRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching contract details by ID: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllContractDetails() {
    try {
      this.logger.log('Fetching all contract details');

      const records = await this.contractDetailsDbService.findAll();

      if (!records || records.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      // Convert database records to original sheet format
      const recordsWithOriginalKeys = records.map((record) => {
        const convertedRecord =
          this.contractDetailsDbService.convertDbDataToSheet(record);
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
        `Error fetching all contract details: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields for file uploads
      transform: true,
    }),
  )
  async updateContractDetails(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateContractDetailsDto>,
  ) {
    try {
      this.logger.log(`Updating contract details with ID: ${id}`);

      // Find existing record by sheetId
      const existingRecord =
        await this.contractDetailsDbService.findBySheetId(id);
      if (!existingRecord) {
        return { success: false, message: 'Contract details not found' };
      }

      // Prepare update data with only provided fields
      const updateData: any = {};
      if (updateDto['Credit Application ID'] !== undefined) {
        updateData.creditApplicationId = updateDto['Credit Application ID'];
      }
      if (updateDto['Loan Length Requested (Months)'] !== undefined) {
        updateData.loanLengthRequestedMonths =
          updateDto['Loan Length Requested (Months)']?.toString();
      }
      if (updateDto['Months the School Requests Forgiveness'] !== undefined) {
        updateData.monthsSchoolRequestsForgiveness =
          updateDto['Months the School Requests Forgiveness']?.toString();
      }
      if (updateDto['Disbursal Date Requested'] !== undefined) {
        updateData.disbursalDateRequested =
          updateDto['Disbursal Date Requested'];
      }
      if (updateDto['10% Down on Vehicle or Land Financing?'] !== undefined) {
        updateData.tenPercentDownOnVehicleOrLandFinancing =
          updateDto['10% Down on Vehicle or Land Financing?'];
      }
      if (updateDto['Created By'] !== undefined) {
        updateData.createdBy = updateDto['Created By'];
      }

      const updatedRecord = await this.contractDetailsDbService.updateById(
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

      return {
        success: true,
        message: 'Contract details updated successfully',
        data: {
          id: updatedRecord.id,
          sheetId: updatedRecord.sheetId,
          ...updateData,
        },
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating contract details: ${apiError.message}`);
      throw error;
    }
  }

  @Delete(':id')
  async deleteContractDetails(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting contract details with ID: ${id}`);

      // Find existing record by sheetId
      const existingRecord =
        await this.contractDetailsDbService.findBySheetId(id);
      if (!existingRecord) {
        return { success: false, message: 'Contract details not found' };
      }

      // Delete from Google Sheets if sheetId is not temporary
      if (id && !id.startsWith('CD-')) {
        try {
          await this.sheetsService.deleteRow(this.SHEET_NAME, id, true);
          this.logger.log(`Deleted from Google Sheets: ${id}`);
        } catch (error) {
          this.logger.warn(`Failed to delete from Google Sheets: ${error}`);
        }
      }

      // Delete from database
      await this.contractDetailsDbService.delete(existingRecord.id.toString());

      return {
        success: true,
        message: 'Contract details deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error deleting contract details: ${apiError.message}`);
      throw error;
    }
  }

  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      // Trigger sync after a short delay to ensure database transaction is committed
      setTimeout(async () => {
        try {
          await this.contractDetailsSyncService.syncContractDetailsById(
            dbId,
            operation,
          );
          this.logger.log(
            `Background sync completed for contract details ${dbId} (${operation})`,
          );
        } catch (error) {
          this.logger.error(
            `Background sync failed for contract details ${dbId}:`,
            error,
          );
        }
      }, 1000);
    } catch (error) {
      this.logger.error('Error triggering background sync:', error);
    }
  }

  @Post('sync/:id')
  async syncContractDetailsById(
    @Param('id') id: string,
    @Body() body: { operation?: 'create' | 'update' },
  ) {
    try {
      const result =
        await this.contractDetailsSyncService.syncContractDetailsById(
          parseInt(id),
          body.operation,
        );
      return result;
    } catch (error) {
      this.logger.error(`Error syncing contract details ${id}:`, error);
      throw error;
    }
  }

  @Post('sync-all')
  async syncAllContractDetails() {
    try {
      const result = await this.contractDetailsSyncService.syncAllToSheets();
      return result;
    } catch (error) {
      this.logger.error('Error syncing all contract details:', error);
      throw error;
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncContractDetailsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      const result =
        await this.contractDetailsSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error) {
      this.logger.error(
        `Error syncing contract details for application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }
}
