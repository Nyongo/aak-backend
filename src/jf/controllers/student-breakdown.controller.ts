import {
  Controller,
  Post,
  Get,
  Put,
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

@Controller('jf/student-breakdown')
export class StudentBreakdownController {
  private readonly logger = new Logger(StudentBreakdownController.name);
  private readonly SHEET_NAME = 'Student Breakdown';

  constructor(private readonly sheetsService: SheetsService) {}

  @Post()
  async createStudentBreakdown(
    @Body()
    createDto: {
      creditApplicationId: string;
      feeType: string; // e.g. "School Fee"
      term: string; // e.g. "Kenyan School Term: Term 1, 21-22"
      grade: string; // e.g. "1"
      numberOfStudents: number;
      fee: number;
    },
  ) {
    try {
      // Generate unique ID for the breakdown
      const id = `SB-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

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

      // Calculate total amount
      const totalAmount = createDto.numberOfStudents * createDto.fee;

      const rowData = {
        ID: id,
        'Credit Application': createDto.creditApplicationId,
        'Fee Type': createDto.feeType,
        'Term ID': createDto.term,
        Grade: createDto.grade,
        'Number of Students': createDto.numberOfStudents,
        Fee: createDto.fee,
        'Total Revenue': createDto.fee * createDto.numberOfStudents,
        'Created At': createdAt,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Student breakdown record created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating student breakdown record: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getBreakdownsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching student breakdowns for application ID: ${creditApplicationId}`,
      );

      const breakdowns = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!breakdowns || breakdowns.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = breakdowns[0];
      const applicationIdIndex = headers.indexOf('Credit Application');

      if (applicationIdIndex === -1) {
        return {
          success: false,
          message: 'Credit Application column not found',
          data: [],
        };
      }

      const filteredData = breakdowns
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const breakdown = {};
          headers.forEach((header, index) => {
            breakdown[header] = row[index];
          });
          return breakdown;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching student breakdowns for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getBreakdownById(@Param('id') id: string) {
    try {
      const breakdowns = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!breakdowns || breakdowns.length === 0) {
        return { success: false, message: 'No student breakdowns found' };
      }

      const headers = breakdowns[0];
      const idIndex = headers.indexOf('ID');
      const breakdownRow = breakdowns.find((row) => row[idIndex] === id);

      if (!breakdownRow) {
        return { success: false, message: 'Student breakdown not found' };
      }

      const breakdown = {};
      headers.forEach((header, index) => {
        breakdown[header] = breakdownRow[index];
      });

      return { success: true, data: breakdown };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching student breakdown ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllBreakdowns() {
    try {
      const breakdowns = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!breakdowns || breakdowns.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = breakdowns[0];
      const data = breakdowns.slice(1).map((row) => {
        const breakdown = {};
        headers.forEach((header, index) => {
          breakdown[header] = row[index];
        });
        return breakdown;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all student breakdowns: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  async updateStudentBreakdown(
    @Param('id') id: string,
    @Body()
    updateDto: {
      creditApplicationId?: string;
      feeType?: string;
      term?: string;
      grade?: string;
      numberOfStudents?: number;
      fee?: number;
    },
  ) {
    try {
      this.logger.log(`Updating student breakdown with ID: ${id}`);

      // First verify the breakdown exists
      const breakdowns = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!breakdowns || breakdowns.length === 0) {
        return { success: false, message: 'No student breakdowns found' };
      }

      const headers = breakdowns[0];
      const idIndex = headers.indexOf('ID');
      const breakdownRow = breakdowns.find((row) => row[idIndex] === id);

      if (!breakdownRow) {
        return { success: false, message: 'Student breakdown not found' };
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        if (header === 'Credit Application' && updateDto.creditApplicationId) {
          return updateDto.creditApplicationId;
        }
        if (header === 'Fee Type' && updateDto.feeType) {
          return updateDto.feeType;
        }
        if (header === 'Term ID' && updateDto.term) {
          return updateDto.term;
        }
        if (header === 'Grade' && updateDto.grade) {
          return updateDto.grade;
        }
        if (
          header === 'Number of Students' &&
          updateDto.numberOfStudents !== undefined
        ) {
          return updateDto.numberOfStudents;
        }
        if (header === 'Fee' && updateDto.fee !== undefined) {
          return updateDto.fee;
        }
        if (
          header === 'Total Revenue' &&
          (updateDto.numberOfStudents !== undefined ||
            updateDto.fee !== undefined)
        ) {
          const students =
            updateDto.numberOfStudents !== undefined
              ? updateDto.numberOfStudents
              : breakdownRow[headers.indexOf('Number of Students')];
          const fee =
            updateDto.fee !== undefined
              ? updateDto.fee
              : breakdownRow[headers.indexOf('Fee')];
          return students * fee;
        }
        return breakdownRow[index] || '';
      });

      // Update the row
      await this.sheetsService.updateRow(this.SHEET_NAME, id, updatedRowData);

      // Get the updated breakdown record
      const updatedBreakdown = {};
      headers.forEach((header, index) => {
        updatedBreakdown[header] = updatedRowData[index];
      });

      return {
        success: true,
        message: 'Student breakdown updated successfully',
        data: updatedBreakdown,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error updating student breakdown: ${apiError.message}`,
      );
      throw error;
    }
  }
}
