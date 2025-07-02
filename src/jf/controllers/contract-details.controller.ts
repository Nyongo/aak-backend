import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  Put,
} from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

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
  ) {}

  @Post()
  async createContractDetails(
    @Body()
    createDto: {
      'Credit Application ID': string;
      'Loan Length Requested (Months)': number;
      'Months the School Requests Forgiveness': number;
      'Disbursal Date Requested': string;
      '10% Down on Vehicle or Land Financing?': 'TRUE' | 'FALSE';
      'Created By': string;
    },
  ) {
    try {
      const createdAt = new Date().toISOString();
      const id = `CD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const rowData = {
        ID: id,
        'Credit Application ID': createDto['Credit Application ID'],
        'Loan Length Requested (Months)':
          createDto['Loan Length Requested (Months)'],
        'Months the School Requests Forgiveness':
          createDto['Months the School Requests Forgiveness'],
        'Disbursal Date Requested': createDto['Disbursal Date Requested'],
        '10% Down on Vehicle or Land Financing?':
          createDto['10% Down on Vehicle or Land Financing?'],
        'Created At': createdAt,
        'Created By': createDto['Created By'],
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);
      return {
        success: true,
        message: 'Active debt added successfully',
        data: rowData,
      };
    } catch (error) {
      this.logger.error('Error creating contract details:', error);
      throw error;
    }
  }

  @Get()
  async getAllContractDetails() {
    try {
      const rows = await this.sheetsService.getSheetData(this.SHEET_NAME);
      return rows;
    } catch (error) {
      this.logger.error('Error fetching contract details:', error);
      throw error;
    }
  }

  @Get(':id')
  async getContractDetailsById(@Param('id') id: string) {
    try {
      const rows = await this.sheetsService.getSheetData(this.SHEET_NAME);
      const contractDetails = rows.find((row) => row.ID === id);
      if (!contractDetails) {
        throw new Error('Contract details not found');
      }
      return contractDetails;
    } catch (error) {
      this.logger.error('Error fetching contract details by ID:', error);
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getSurveysByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching financial surveys for application ID: ${creditApplicationId}`,
      );

      const surveys = await this.sheetsService.getSheetData(this.SHEET_NAME);
      this.logger.debug(`Retrieved ${surveys?.length || 0} rows from sheet`);

      if (!surveys || surveys.length === 0) {
        this.logger.debug('No financial surveys found in sheet');
        return { success: true, count: 0, data: [] };
      }

      const headers = surveys[0];
      this.logger.debug(`Sheet headers: ${headers.join(', ')}`);

      const applicationIdIndex = headers.indexOf('Credit Application ID');
      this.logger.debug(
        `Credit Application ID column index: ${applicationIdIndex}`,
      );

      if (applicationIdIndex === -1) {
        this.logger.warn('Credit Application ID column not found in sheet');
        return {
          success: false,
          message: 'Credit Application ID column not found',
          data: [],
        };
      }

      const filteredData = surveys
        .slice(1)
        .filter((row) => {
          const matches = row[applicationIdIndex] === creditApplicationId;
          this.logger.debug(
            `Row ${row[0]} application ID: ${row[applicationIdIndex]}, matches: ${matches}`,
          );
          return matches;
        })
        .map((row) => {
          const survey = {};
          headers.forEach((header, index) => {
            survey[header] = row[index];
          });
          return survey;
        });

      this.logger.debug(`Found ${filteredData.length} matching surveys`);

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching financial surveys for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  async updateContractDetails(
    @Param('id') id: string,
    @Body()
    updateDto: {
      'Credit Application ID'?: string;
      'Loan Length Requested (Months)'?: number;
      'Months the School Requests Forgiveness'?: number;
      'Disbursal Date Requested'?: string;
      '10% Down on Vehicle or Land Financing?'?: 'TRUE' | 'FALSE';
      'Created By'?: string;
    },
  ) {
    try {
      this.logger.debug(`Updating contract details with ID: ${id}`, updateDto);

      // First verify the record exists
      const records = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!records || records.length === 0) {
        return {
          success: false,
          error: 'No contract details found',
        };
      }

      const headers = records[0];
      const idIndex = headers.indexOf('ID');
      const recordRow = records.find((row) => row[idIndex] === id);

      if (!recordRow) {
        return {
          success: false,
          error: 'Contract details not found',
        };
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        const currentValue = recordRow[index] || '';

        // Check if the field is provided in the update DTO
        if (updateDto[header] !== undefined) {
          return updateDto[header];
        }

        // Keep existing value for all other fields
        return currentValue;
      });

      // Update the row
      await this.sheetsService.updateRow(this.SHEET_NAME, id, updatedRowData);

      // Get the updated record
      const updatedRecords = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );
      const updatedRecordRow = updatedRecords.find(
        (row) => row[idIndex] === id,
      );

      const updatedRecord = {};
      headers.forEach((header, index) => {
        updatedRecord[header] = updatedRecordRow[index];
      });

      return {
        success: true,
        message: 'Contract details updated successfully',
        data: updatedRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating contract details: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
