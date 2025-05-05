import { Controller, Post, Get, Param, Body, Logger } from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/home-visit')
export class HomeVisitController {
  private readonly logger = new Logger(HomeVisitController.name);
  private readonly SHEET_NAME = 'Home Visits';

  constructor(private readonly sheetsService: SheetsService) {}

  @Post()
  async createHomeVisit(
    @Body()
    createDto: {
      'Credit Application ID': string;
      'Visit Date': string;
      Director: string;
      County: string;
      'Address Details': string;
      'Location Pin': string;
      'Own or Rent': 'Own' | 'Rent';
      'How many years have they stayed there?': number;
      'Marital Status': string;
      'How many children does the director have?': number;
      'Is the spouse involved in running school?': 'Y' | 'N';
      'Does the spouse have other income?': 'Y' | 'N';
      'If yes, how much per month?': number;
      'Is the director behind on any utility bills at home?': 'Y' | 'N';
      'What is the total number of rooms in house? (Include all types of rooms)': number;
      'How is the neighborhood? Provide general comments.': string;
      'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home?': string;
      "Is the director's home in the same city as their school?": 'Y' | 'N';
      'Is the director a trained educator?': 'Y' | 'N';
      'Does the director have another profitable business?': 'Y' | 'N';
      'Other Notes': string;
    },
  ) {
    try {
      // Generate unique ID for the home visit
      const id = `HV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

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

      // Get the current sheet headers to ensure we save all fields
      const sheetData = await this.sheetsService.getSheetData(this.SHEET_NAME);
      const headers = sheetData[0];

      // Create a map of all fields to save
      const rowData = {
        ID: id,
        'Created At': createdAt,
      };

      // Add all fields from the DTO to the rowData
      for (const [key, value] of Object.entries(createDto)) {
        rowData[key] = value;
      }

      // Ensure all headers from the sheet are included in the rowData
      for (const header of headers) {
        if (!(header in rowData)) {
          rowData[header] = '';
        }
      }

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Home visit record created successfully',
        data: rowData,
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
  async getVisitsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      const visits = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!visits || visits.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = visits[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      const filteredData = visits
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const visit = {};
          headers.forEach((header, index) => {
            visit[header] = row[index];
          });
          return visit;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching visits for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getVisitById(@Param('id') id: string) {
    try {
      const visits = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!visits || visits.length === 0) {
        return { success: false, message: 'No visits found' };
      }

      const headers = visits[0];
      const idIndex = headers.indexOf('ID');
      const visitRow = visits.find((row) => row[idIndex] === id);

      if (!visitRow) {
        return { success: false, message: 'Visit not found' };
      }

      const visit = {};
      headers.forEach((header, index) => {
        visit[header] = visitRow[index];
      });

      return { success: true, data: visit };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching visit ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Get()
  async getAllVisits() {
    try {
      const visits = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!visits || visits.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = visits[0];
      const data = visits.slice(1).map((row) => {
        const visit = {};
        headers.forEach((header, index) => {
          visit[header] = row[index];
        });
        return visit;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all visits: ${apiError.message}`);
      throw error;
    }
  }
}
