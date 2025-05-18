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

@Controller('jf/home-visits')
export class HomeVisitController {
  private readonly logger = new Logger(HomeVisitController.name);
  private readonly SHEET_NAME = 'Home Visits';

  constructor(private readonly sheetsService: SheetsService) {}

  @Post()
  async createHomeVisit(
    @Body()
    createDto: {
      'Credit Application ID': string;
      'User ID': string;
      County: string;
      'Address Details ': string;
      'Location Pin': string;
      'Own or Rent': string;
      'How many years have they stayed there?': string;
      'Marital Status': string;
      'How many children does the director have?': string;
      'Is the spouse involved in running school?': string;
      'Does the spouse have other income?': string;
      'If yes, how much per month? ': string;
      'Is the director behind on any utility bills at home? ': string;
      'What is the total number of rooms in house? (Include all types of rooms) ': string;
      'How is the neighborhood? Provide general comments.': string;
      'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? ': string;
      "Is the director's home in the same city as their school? ": string;
      'Is the director a trained educator?': string;
      'Does the director have another profitable business?': string;
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

      const rowData = {
        ID: id,
        'Credit Application ID': createDto['Credit Application ID'],
        'User ID': createDto['User ID'],
        County: createDto.County,
        'Address Details ': createDto['Address Details '],
        'Location Pin': createDto['Location Pin'],
        'Own or Rent': createDto['Own or Rent'],
        'How many years have they stayed there?':
          createDto['How many years have they stayed there?'],
        'Marital Status': createDto['Marital Status'],
        'How many children does the director have?':
          createDto['How many children does the director have?'],
        'Is the spouse involved in running school?':
          createDto['Is the spouse involved in running school?'],
        'Does the spouse have other income?':
          createDto['Does the spouse have other income?'],
        'If yes, how much per month? ':
          createDto['If yes, how much per month? '],
        'Is the director behind on any utility bills at home? ':
          createDto['Is the director behind on any utility bills at home? '],
        'What is the total number of rooms in house? (Include all types of rooms) ':
          createDto[
            'What is the total number of rooms in house? (Include all types of rooms) '
          ],
        'How is the neighborhood? Provide general comments.':
          createDto['How is the neighborhood? Provide general comments.'],
        'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? ':
          createDto[
            'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? '
          ],
        "Is the director's home in the same city as their school? ":
          createDto[
            "Is the director's home in the same city as their school? "
          ],
        'Is the director a trained educator?':
          createDto['Is the director a trained educator?'],
        'Does the director have another profitable business?':
          createDto['Does the director have another profitable business?'],
        'Other Notes': createDto['Other Notes'],
        'Created At': createdAt,
      };

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
  async getHomeVisitsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Fetching home visits for credit application: ${creditApplicationId}`,
      );
      const homeVisits = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!homeVisits || homeVisits.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = homeVisits[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      if (applicationIdIndex === -1) {
        throw new Error('Credit Application ID column not found in sheet');
      }

      const filteredData = homeVisits
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const homeVisit = {};
          headers.forEach((header, index) => {
            homeVisit[header] = row[index];
          });
          return homeVisit;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
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
      const homeVisits = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!homeVisits || homeVisits.length === 0) {
        return { success: false, message: 'No home visits found' };
      }

      const headers = homeVisits[0];
      const idIndex = headers.indexOf('ID');
      const homeVisitRow = homeVisits.find((row) => row[idIndex] === id);

      if (!homeVisitRow) {
        return { success: false, message: 'Home visit not found' };
      }

      const homeVisit = {};
      headers.forEach((header, index) => {
        homeVisit[header] = homeVisitRow[index];
      });

      return { success: true, data: homeVisit };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching home visit ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Get()
  async getAllHomeVisits() {
    try {
      const homeVisits = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!homeVisits || homeVisits.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = homeVisits[0];
      const data = homeVisits.slice(1).map((row) => {
        const homeVisit = {};
        headers.forEach((header, index) => {
          homeVisit[header] = row[index];
        });
        return homeVisit;
      });

      return {
        success: true,
        count: data.length,
        data,
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
    @Body()
    updateDto: {
      'Credit Application ID'?: string;
      'User ID'?: string;
      County?: string;
      'Address Details '?: string;
      'Location Pin'?: string;
      'Own or Rent'?: string;
      'How many years have they stayed there?'?: string;
      'Marital Status'?: string;
      'How many children does the director have?'?: string;
      'Is the spouse involved in running school?'?: string;
      'Does the spouse have other income?'?: string;
      'If yes, how much per month? '?: string;
      'Is the director behind on any utility bills at home? '?: string;
      'What is the total number of rooms in house? (Include all types of rooms) '?: string;
      'How is the neighborhood? Provide general comments.'?: string;
      'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? '?: string;
      "Is the director's home in the same city as their school? "?: string;
      'Is the director a trained educator?'?: string;
      'Does the director have another profitable business?'?: string;
      'Other Notes'?: string;
    },
  ) {
    try {
      this.logger.log(`Updating home visit with ID: ${id}`);

      // First verify the home visit exists
      const homeVisits = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!homeVisits || homeVisits.length === 0) {
        return { success: false, message: 'No home visits found' };
      }

      const headers = homeVisits[0];
      const idIndex = headers.indexOf('ID');
      const homeVisitRow = homeVisits.find((row) => row[idIndex] === id);

      if (!homeVisitRow) {
        return { success: false, message: 'Home visit not found' };
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        if (
          header === 'Credit Application ID' &&
          updateDto['Credit Application ID']
        ) {
          return updateDto['Credit Application ID'];
        }
        if (header === 'User ID' && updateDto['User ID']) {
          return updateDto['User ID'];
        }
        if (header === 'County' && updateDto.County) {
          return updateDto.County;
        }
        if (header === 'Address Details ' && updateDto['Address Details ']) {
          return updateDto['Address Details '];
        }
        if (header === 'Location Pin' && updateDto['Location Pin']) {
          return updateDto['Location Pin'];
        }
        if (header === 'Own or Rent' && updateDto['Own or Rent']) {
          return updateDto['Own or Rent'];
        }
        if (
          header === 'How many years have they stayed there?' &&
          updateDto['How many years have they stayed there?']
        ) {
          return updateDto['How many years have they stayed there?'];
        }
        if (header === 'Marital Status' && updateDto['Marital Status']) {
          return updateDto['Marital Status'];
        }
        if (
          header === 'How many children does the director have?' &&
          updateDto['How many children does the director have?']
        ) {
          return updateDto['How many children does the director have?'];
        }
        if (
          header === 'Is the spouse involved in running school?' &&
          updateDto['Is the spouse involved in running school?']
        ) {
          return updateDto['Is the spouse involved in running school?'];
        }
        if (
          header === 'Does the spouse have other income?' &&
          updateDto['Does the spouse have other income?']
        ) {
          return updateDto['Does the spouse have other income?'];
        }
        if (
          header === 'If yes, how much per month? ' &&
          updateDto['If yes, how much per month? ']
        ) {
          return updateDto['If yes, how much per month? '];
        }
        if (
          header === 'Is the director behind on any utility bills at home? ' &&
          updateDto['Is the director behind on any utility bills at home? ']
        ) {
          return updateDto[
            'Is the director behind on any utility bills at home? '
          ];
        }
        if (
          header ===
            'What is the total number of rooms in house? (Include all types of rooms) ' &&
          updateDto[
            'What is the total number of rooms in house? (Include all types of rooms) '
          ]
        ) {
          return updateDto[
            'What is the total number of rooms in house? (Include all types of rooms) '
          ];
        }
        if (
          header === 'How is the neighborhood? Provide general comments.' &&
          updateDto['How is the neighborhood? Provide general comments.']
        ) {
          return updateDto[
            'How is the neighborhood? Provide general comments.'
          ];
        }
        if (
          header ===
            'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? ' &&
          updateDto[
            'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? '
          ]
        ) {
          return updateDto[
            'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? '
          ];
        }
        if (
          header ===
            "Is the director's home in the same city as their school? " &&
          updateDto["Is the director's home in the same city as their school? "]
        ) {
          return updateDto[
            "Is the director's home in the same city as their school? "
          ];
        }
        if (
          header === 'Is the director a trained educator?' &&
          updateDto['Is the director a trained educator?']
        ) {
          return updateDto['Is the director a trained educator?'];
        }
        if (
          header === 'Does the director have another profitable business?' &&
          updateDto['Does the director have another profitable business?']
        ) {
          return updateDto[
            'Does the director have another profitable business?'
          ];
        }
        if (header === 'Other Notes' && updateDto['Other Notes']) {
          return updateDto['Other Notes'];
        }
        return homeVisitRow[index] || '';
      });

      // Update the row
      await this.sheetsService.updateRow(this.SHEET_NAME, id, updatedRowData);

      // Get the updated home visit record
      const updatedHomeVisit = {};
      headers.forEach((header, index) => {
        updatedHomeVisit[header] = updatedRowData[index];
      });

      return {
        success: true,
        message: 'Home visit updated successfully',
        data: updatedHomeVisit,
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

      // First verify the home visit exists
      const homeVisits = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!homeVisits || homeVisits.length === 0) {
        return { success: false, message: 'No home visits found' };
      }

      const headers = homeVisits[0];
      const idIndex = headers.indexOf('ID');
      const homeVisitRow = homeVisits.find((row) => row[idIndex] === id);

      if (!homeVisitRow) {
        return { success: false, message: 'Home visit not found' };
      }

      // Delete the row
      await this.sheetsService.deleteRow(this.SHEET_NAME, id);

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
}
