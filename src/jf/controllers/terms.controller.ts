import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Logger,
} from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/terms')
export class TermsController {
  private readonly logger = new Logger(TermsController.name);
  private readonly SHEET_NAME = 'Terms';

  constructor(private readonly sheetsService: SheetsService) {}

  @Post()
  async createTerm(
    @Body()
    createDto: {
      jackfruitTerm: string;
      year: string;
      kenyanSchoolTerm: string;
      firstDayOfSchool: string;
      lastDayOfSchool: string;
    },
  ) {
    try {
      this.logger.log('Creating new term');

      // Generate unique ID for the term
      const id = `TERM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      const rowData = {
        ID: id,
        'Jackfruit Term': createDto.jackfruitTerm,
        Year: createDto.year,
        'Kenyan School Term': createDto.kenyanSchoolTerm,
        'First Day of School': createDto.firstDayOfSchool,
        'Last Day of School': createDto.lastDayOfSchool,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Term created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error creating term: ${apiError.message}`);
      throw error;
    }
  }

  @Get()
  async getAllTerms() {
    try {
      this.logger.debug('Fetching all terms');

      const terms = await this.sheetsService.getSheetData(this.SHEET_NAME);
      this.logger.debug(`Retrieved ${terms?.length || 0} rows from sheet`);

      if (!terms || terms.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = terms[0];
      this.logger.debug(`Sheet headers: ${headers.join(', ')}`);

      const data = terms.slice(1).map((row) => {
        const term = {};
        headers.forEach((header, index) => {
          term[header] = row[index];
        });
        return term;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all terms: ${apiError.message}`);
      throw error;
    }
  }

  @Get(':id')
  async getTermById(@Param('id') id: string) {
    try {
      const terms = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!terms || terms.length === 0) {
        return { success: false, message: 'No terms found' };
      }

      const headers = terms[0];
      const idIndex = headers.indexOf('ID');
      const termRow = terms.find((row) => row[idIndex] === id);

      if (!termRow) {
        return { success: false, message: 'Term not found' };
      }

      const term = {};
      headers.forEach((header, index) => {
        term[header] = termRow[index];
      });

      return { success: true, data: term };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching term ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Put(':id')
  async updateTerm(
    @Param('id') id: string,
    @Body()
    updateDto: {
      jackfruitTerm?: string;
      year?: string;
      kenyanSchoolTerm?: string;
      firstDayOfSchool?: string;
      lastDayOfSchool?: string;
    },
  ) {
    try {
      this.logger.log(`Updating term with ID: ${id}`);

      // First verify the term exists
      const terms = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!terms || terms.length === 0) {
        return { success: false, message: 'No terms found' };
      }

      const headers = terms[0];
      const idIndex = headers.indexOf('ID');
      const termRow = terms.find((row) => row[idIndex] === id);

      if (!termRow) {
        return { success: false, message: 'Term not found' };
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        if (header === 'Jackfruit Term' && updateDto.jackfruitTerm) {
          return updateDto.jackfruitTerm;
        }
        if (header === 'Year' && updateDto.year) {
          return updateDto.year;
        }
        if (header === 'Kenyan School Term' && updateDto.kenyanSchoolTerm) {
          return updateDto.kenyanSchoolTerm;
        }
        if (header === 'First Day of School' && updateDto.firstDayOfSchool) {
          return updateDto.firstDayOfSchool;
        }
        if (header === 'Last Day of School' && updateDto.lastDayOfSchool) {
          return updateDto.lastDayOfSchool;
        }
        return termRow[index] || '';
      });

      // Update the row
      await this.sheetsService.updateRow(this.SHEET_NAME, id, updatedRowData);

      // Get the updated term record
      const updatedTerm = {};
      headers.forEach((header, index) => {
        updatedTerm[header] = updatedRowData[index];
      });

      return {
        success: true,
        message: 'Term updated successfully',
        data: updatedTerm,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating term: ${apiError.message}`);
      throw error;
    }
  }

  @Delete(':id')
  async deleteTerm(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting term with ID: ${id}`);

      // First verify the term exists
      const terms = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!terms || terms.length === 0) {
        return { success: false, message: 'No terms found' };
      }

      const headers = terms[0];
      const idIndex = headers.indexOf('ID');
      const termRow = terms.find((row) => row[idIndex] === id);

      if (!termRow) {
        return { success: false, message: 'Term not found' };
      }

      // Delete the row
      await this.sheetsService.deleteRow(this.SHEET_NAME, id);

      return {
        success: true,
        message: 'Term deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error deleting term: ${apiError.message}`);
      throw error;
    }
  }
}
