import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Logger,
  Put,
  Delete,
} from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/investment-committee')
export class InvestmentCommitteeController {
  private readonly logger = new Logger(InvestmentCommitteeController.name);
  private readonly SHEET_NAME = 'Investment Committee';

  constructor(private readonly sheetsService: SheetsService) {}

  @Post()
  async createInvestmentCommitteeRecord(
    @Body()
    createDto: {
      'Credit Application ID': string;
      'Audited financials provided?': string;
      'School has a bank account and checks from that bank account?': string;
      'Total annual revenue from fees from student breakdown, Unadjusted'?: string;
      'Annual revenue from Banka and M Pesa Statements': string;
      'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)': string;
      'Debt Ratio': string;
      'Loan Length (Months)': string;
      'Annual Reducing Interest Rate': string;
      'Total estimated value of assets held by school and directors (KES)': string;
      'Predicted Days Late': string;
      'Average bank balance (KES)': string;
      creditApplication?: string; // This is redundant, but we handle it.
    },
  ) {
    try {
      this.logger.debug('Creating new investment committee record', createDto);

      // Generate unique ID for the record
      const id = `IC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Format current date as DD/MM/YYYY HH:mm:ss
      const now = new Date();
      const createdAt = now.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const rowData = {
        ID: id,
        'Credit Application ID':
          createDto['Credit Application ID'] || createDto.creditApplication,
        'Audited financials provided?':
          createDto['Audited financials provided?'],
        'School has a bank account and checks from that bank account?':
          createDto[
            'School has a bank account and checks from that bank account?'
          ],
        // 'Total annual revenue from fees from student breakdown, Unadjusted':
        //   createDto[
        //     'Total annual revenue from fees from student breakdown, Unadjusted'
        //   ],
        'Annual revenue from Banka and M Pesa Statements':
          createDto['Annual revenue from Banka and M Pesa Statements'],
        'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)':
          createDto[
            'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)'
          ],
        'Debt Ratio': '40%',
        'Loan Length (Months)': createDto['Loan Length (Months)'],
        'Annual Reducing Interest Rate': `${createDto['Annual Reducing Interest Rate']}%`,
        'Total estimated value of assets held by school and directors (KES)':
          createDto[
            'Total estimated value of assets held by school and directors (KES)'
          ],
        'Predicted Days Late': 0,
        'Average bank balance (KES)': createDto['Average bank balance (KES)'],
        'Created At': createdAt,
      };

      // Use the new method that handles formulas automatically
      await this.sheetsService.appendRowWithFormulas(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Investment committee record created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating investment committee record: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplication')
  async getRecordsByApplication(
    @Param('creditApplication') creditApplication: string,
  ) {
    try {
      this.logger.debug(
        `Fetching investment committee records for application: ${creditApplication}`,
      );

      const records = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!records || records.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = records[0];
      const applicationIndex = headers.indexOf('Credit Application ID');

      if (applicationIndex === -1) {
        return {
          success: false,
          message: 'Credit Application ID column not found',
          data: [],
        };
      }

      const filteredData = records
        .slice(1)
        .filter((row) => row[applicationIndex] === creditApplication)
        .map((row) => {
          const record = {};
          headers.forEach((header, index) => {
            record[header] = row[index];
          });
          return record;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching investment committee records for application ${creditApplication}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getRecordById(@Param('id') id: string) {
    try {
      const records = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!records || records.length === 0) {
        return {
          success: false,
          message: 'No investment committee records found',
        };
      }

      const headers = records[0];
      const idIndex = headers.indexOf('ID');
      const recordRow = records.find((row) => row[idIndex] === id);

      if (!recordRow) {
        return {
          success: false,
          message: 'Investment committee record not found',
        };
      }

      const record = {};
      headers.forEach((header, index) => {
        record[header] = recordRow[index];
      });

      return { success: true, data: record };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching investment committee record ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllRecords() {
    try {
      const records = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!records || records.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = records[0];
      const data = records.slice(1).map((row) => {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index];
        });
        return record;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all investment committee records: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  async updateInvestmentCommitteeRecord(
    @Param('id') id: string,
    @Body()
    updateDto: {
      creditApplication?: string;
      'Audited financials provided?'?: string;
      'School has a bank account and checks from that bank account?'?: string;
      'Annual revenue from Banka and M Pesa Statements'?: string;
      'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)'?: string;
      'Loan Length (Months)'?: string;
      'Annual Reducing Interest Rate'?: string;
      'Total estimated value of assets held by school and directors (KES)'?: string;
      'Average bank balance (KES)'?: string;
    },
  ) {
    try {
      this.logger.debug(
        `Updating investment committee record with ID: ${id}`,
        updateDto,
      );

      // First verify the record exists
      const records = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!records || records.length === 0) {
        return {
          success: false,
          error: 'No investment committee records found',
        };
      }

      const headers = records[0];
      const idIndex = headers.indexOf('ID');
      const recordRow = records.find((row) => row[idIndex] === id);

      if (!recordRow) {
        return {
          success: false,
          error: 'Investment committee record not found',
        };
      }

      // Get formulas to identify calculated fields
      const { formulas } = await this.sheetsService.getSheetDataWithFormulas(
        this.SHEET_NAME,
      );

      // Create updated row data, only updating fields that are provided and not formulas
      const updatedRowData = headers.map((header, index) => {
        const currentValue = recordRow[index] || '';
        const hasFormula = formulas[index] && formulas[index].startsWith('=');

        // If this field has a formula, preserve it and don't overwrite
        if (hasFormula) {
          this.logger.debug(`Preserving formula for field: ${header}`);
          return currentValue; // Keep the existing formula result
        }

        // Check if the field is provided in the update DTO
        if (updateDto[header] !== undefined) {
          return updateDto[header];
        }

        // Special handling for creditApplication field
        if (header === 'Credit Application ID' && updateDto.creditApplication) {
          return updateDto.creditApplication;
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
        message: 'Investment committee record updated successfully',
        data: updatedRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error updating investment committee record: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Delete(':id')
  async deleteInvestmentCommitteeRecord(@Param('id') id: string) {
    try {
      this.logger.debug(`Deleting investment committee record with ID: ${id}`);

      // First verify the record exists
      const records = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!records || records.length === 0) {
        return {
          success: false,
          error: 'No investment committee records found',
        };
      }

      const headers = records[0];
      const idIndex = headers.indexOf('ID');
      const recordRow = records.find((row) => row[idIndex] === id);

      if (!recordRow) {
        return {
          success: false,
          error: 'Investment committee record not found',
        };
      }

      // Delete the record
      await this.sheetsService.deleteRow(this.SHEET_NAME, id);

      return {
        success: true,
        message: 'Investment committee record deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error deleting investment committee record: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
