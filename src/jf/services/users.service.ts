import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthService } from './google-auth.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  private sheets;
  private readonly logger = new Logger(UsersService.name);
  private readonly USERS_SHEET_ID: string;
  private auth;

  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.logger.log('Initializing UsersService');

    this.USERS_SHEET_ID = this.configService.get('GOOGLE_SHEETS_USERS_ID');
    if (!this.USERS_SHEET_ID) {
      throw new Error('GOOGLE_SHEETS_USERS_ID environment variable is not set');
    }

    this.auth = this.googleAuthService.getAuth();
    if (!this.auth) {
      throw new Error('Failed to initialize Google auth client');
    }

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.logger.log('Google Sheets client initialized for Users');
  }

  async getDirectorsByBorrowerId(borrowerId: string): Promise<any[]> {
    try {
      this.logger.log(`Fetching directors for borrower ID: ${borrowerId}`);
      this.logger.debug(`Using spreadsheet ID: ${this.USERS_SHEET_ID}`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.USERS_SHEET_ID,
        range: 'Users!A:AG',
      });

      this.logger.debug('Google Sheets response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data ? 'Data received' : 'No data',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        this.logger.warn('No data found in the Users sheet');
        return [];
      }

      const headers = rows[0];
      this.logger.debug('Sheet headers:', headers);

      // Find relevant column indices
      const borrowerIdIndex = headers.findIndex(
        (header) => header === 'Borrower ID',
      );
      const typeIndex = headers.findIndex((header) => header === 'Type');

      this.logger.debug('Column indices:', {
        borrowerIdIndex,
        typeIndex,
      });

      if (borrowerIdIndex === -1 || typeIndex === -1) {
        throw new Error(
          'Required columns (Borrower ID or Type) not found in sheet',
        );
      }

      // Filter rows for directors of the specified borrower
      const directors = rows.slice(1).filter((row) => {
        const isMatch =
          row[borrowerIdIndex] === borrowerId &&
          row[typeIndex]?.toLowerCase() === 'director';
        this.logger.debug(`Row match check:`, {
          rowBorrowerId: row[borrowerIdIndex],
          rowType: row[typeIndex],
          isMatch,
        });
        return isMatch;
      });

      this.logger.debug(
        `Found ${directors.length} directors for borrower ${borrowerId}`,
      );

      // Convert rows to objects
      return directors.map((row) => {
        const director: any = {};
        headers.forEach((header: string, index: number) => {
          if (row[index]) {
            director[header] = row[index];
          }
        });
        return director;
      });
    } catch (error) {
      this.logger.error('Error fetching directors:', {
        error: error.message,
        stack: error.stack,
        spreadsheetId: this.USERS_SHEET_ID,
      });
      throw error;
    }
  }

  async addDirector(directorData: any): Promise<any> {
    try {
      this.logger.log('Adding new director');

      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.USERS_SHEET_ID,
        range: 'Users!A1:ZZ1',
      });

      if (!headerResponse.data.values || !headerResponse.data.values[0]) {
        throw new Error('Failed to get headers from sheet');
      }

      const headers = headerResponse.data.values[0];

      // Prepare row data
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index: number) => {
        if (header === 'Type') {
          rowData[index] = 'Director';
        } else if (directorData[header] !== undefined) {
          rowData[index] = directorData[header];
        }
      });

      // Add Created At if exists
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.USERS_SHEET_ID,
        range: 'Users!A2:ZZ2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      return {
        ...directorData,
        Type: 'Director',
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding director:', error);
      throw error;
    }
  }

  async updateDirector(userId: string, updateData: any): Promise<any> {
    try {
      this.logger.log(`Updating director ${userId}`);

      // Get all data to find the row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.USERS_SHEET_ID,
        range: 'Users!A:ZZ',
      });

      const rows = response.data.values;
      const headers = rows[0];

      // Find ID column index
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }

      // Find the row for this user
      const rowIndex = rows.findIndex((row) => row[idIndex] === userId);
      if (rowIndex === -1) {
        throw new Error('Director not found');
      }

      // Create updated row data
      const currentData = rows[rowIndex];
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });

      // Update the row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.USERS_SHEET_ID,
        range: `Users!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });

      return {
        ...updateData,
        ID: userId,
      };
    } catch (error) {
      this.logger.error('Error updating director:', error);
      throw error;
    }
  }
}
