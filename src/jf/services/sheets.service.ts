import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthService } from './google-auth.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface GoogleApiError {
  message: string;
  code?: number;
  status?: string;
  errors?: Array<{ message: string }>;
}

@Injectable()
export class SheetsService {
  private sheets;
  private readonly logger = new Logger(SheetsService.name);
  private readonly BORROWERS_SHEET_ID: string;
  private auth;

  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.logger.log('Initializing SheetsService');

    this.BORROWERS_SHEET_ID = this.configService.get(
      'GOOGLE_SHEETS_BORROWERS_ID',
    );
    if (!this.BORROWERS_SHEET_ID) {
      throw new Error(
        'GOOGLE_SHEETS_BORROWERS_ID environment variable is not set',
      );
    }
    this.logger.log(`Using spreadsheet ID: ${this.BORROWERS_SHEET_ID}`);

    this.auth = this.googleAuthService.getAuth();
    if (!this.auth) {
      throw new Error('Failed to initialize Google auth client');
    }
    this.logger.log('Google auth client initialized');

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.logger.log('Google Sheets client initialized');

    // Verify API access on initialization
    this.verifyApiAccess().catch((error) => {
      this.logger.error(
        'Failed to verify Google Sheets API access during initialization:',
        {
          error: error.message,
          spreadsheetId: this.BORROWERS_SHEET_ID,
          serviceAccount: this.auth?.credentials?.client_email,
        },
      );
    });
  }

  private async verifyApiAccess() {
    if (!this.BORROWERS_SHEET_ID) {
      throw new Error('GOOGLE_SHEETS_BORROWERS_ID is not configured');
    }

    if (!this.auth) {
      throw new Error('Google auth client is not initialized');
    }

    const serviceAccountEmail = this.auth.credentials?.client_email;
    if (!serviceAccountEmail) {
      throw new Error('Service account email not found in credentials');
    }

    this.logger.log('Verifying Google Sheets API access with:', {
      spreadsheetId: this.BORROWERS_SHEET_ID,
      serviceAccountEmail: serviceAccountEmail,
    });

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        fields: 'spreadsheetId,properties.title',
      });

      this.logger.log('Successfully verified access to spreadsheet:', {
        title: response.data.properties?.title,
        id: response.data.spreadsheetId,
      });
    } catch (error) {
      const apiError = error as GoogleApiError;
      this.logger.error('Failed to access spreadsheet:', {
        error: apiError.message,
        code: apiError.code,
        spreadsheetId: this.BORROWERS_SHEET_ID,
        serviceAccountEmail: serviceAccountEmail,
        status: apiError.status,
      });
      throw error;
    }
  }

  private async getHeaderRowAndSSLIDColumn(): Promise<{
    headers: string[];
    sslIdColumn: string;
    sslIdColumnLetter: string;
  }> {
    const cacheKey = 'sheets_headers_info';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached as any;
    }

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.BORROWERS_SHEET_ID,
      range: 'Borrowers!A1:ZZ1',
    });

    const headers = response.data.values[0];
    const sslIdColumnIndex = headers.findIndex((header) => header === 'SSL ID');
    if (sslIdColumnIndex === -1) {
      throw new Error('SSL ID column not found in sheet');
    }

    // Convert column index to A1 notation (0 = A, 1 = B, etc.)
    const sslIdColumnLetter = String.fromCharCode(65 + sslIdColumnIndex);
    const result = {
      headers,
      sslIdColumn: `${sslIdColumnLetter}:${sslIdColumnLetter}`,
      sslIdColumnLetter,
    };

    await this.cacheManager.set(cacheKey, result, 3600); // Cache for 1 hour
    return result;
  }

  async getBorrowers(sslId?: string): Promise<any[]> {
    try {
      this.logger.log(
        `Fetching borrowers${sslId ? ` for SSL ID: ${sslId}` : ''}`,
      );

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Borrowers!A:AZ',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        this.logger.warn('No data found in the Borrowers sheet');
        return [];
      }

      this.logger.debug(`Retrieved ${rows.length} rows from Borrowers sheet`);

      // Get headers from first row
      const headers = rows[0];
      const sslIdIndex = headers.findIndex(
        (header: string) =>
          header.toLowerCase().includes('ssl') &&
          header.toLowerCase().includes('id'),
      );

      if (sslIdIndex === -1) {
        throw new Error('SSL ID column not found in the sheet');
      }

      // Skip header row and filter rows
      const filteredRows = rows.slice(1).filter((row) => {
        if (!sslId) return true;

        // Skip rows without SSL ID
        if (!row[sslIdIndex]) {
          this.logger.debug(`Skipping row - no SSL ID value`);
          return false;
        }

        const rowSslId = row[sslIdIndex].toString().trim();
        const normalizedSslId = sslId.trim();

        const matches = rowSslId === normalizedSslId;
        if (!matches) {
          this.logger.debug(
            `Row SSL ID '${rowSslId}' does not match filter '${normalizedSslId}'`,
          );
        }
        return matches;
      });

      this.logger.debug(
        `Found ${filteredRows.length} matching rows after filtering`,
      );

      // Convert rows to objects using headers
      return filteredRows.map((row) => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          if (row[index]) {
            obj[header] = row[index];
          }
        });
        return obj;
      });
    } catch (error) {
      this.logger.error('Error fetching borrowers from Google Sheets:', error);
      throw error;
    }
  }

  async findBorrowerByName(name: string) {
    try {
      const borrowers = await this.getBorrowers();
      return borrowers.find((borrower) => borrower.Name === name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Error finding borrower by name ${name}:`,
        errorMessage,
      );
      throw new Error(`Failed to find borrower by name: ${errorMessage}`);
    }
  }

  async findBorrowerById(id: string) {
    try {
      const borrowers = await this.getBorrowers();
      return borrowers.find((borrower) => borrower.ID === id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error finding borrower by ID ${id}:`, errorMessage);
      throw new Error(`Failed to find borrower by ID: ${errorMessage}`);
    }
  }

  private generateBorrowerId(): string {
    // Get current timestamp (milliseconds since epoch)
    const timestamp = Date.now();
    // Generate 4 random characters
    const randomChars = crypto.randomBytes(2).toString('hex');
    // Combine and format: B-TIMESTAMP-RANDOM (e.g., B-1679012345678-a1b2)
    return `B-${timestamp}-${randomChars}`;
  }

  async addBorrower(borrowerData: any): Promise<any> {
    try {
      this.logger.log('Starting to add new borrower');

      // Get headers first
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Borrowers!A1:ZZ1',
      });

      if (!headerResponse.data.values || !headerResponse.data.values[0]) {
        throw new Error('Failed to get headers from sheet');
      }

      const headers = headerResponse.data.values[0];
      this.logger.debug('Sheet headers:', headers);

      // Generate a unique BorrowerID
      const borrowerId = this.generateBorrowerId();
      this.logger.debug(`Generated ID: ${borrowerId}`);

      // Find the ID column index
      const idIndex = headers.findIndex((header: string) => header === 'ID');

      if (idIndex === -1) {
        this.logger.error('Available headers:', headers);
        throw new Error('ID column not found in sheet');
      }
      this.logger.debug(`Found ID column at index: ${idIndex}`);

      // Prepare row data
      const rowData = new Array(headers.length).fill(''); // Initialize with empty strings
      headers.forEach((header: string, index: number) => {
        if (header === 'ID') {
          rowData[index] = borrowerId;
        } else if (borrowerData[header] !== undefined) {
          rowData[index] = borrowerData[header];
        }
      });

      // Add Created At if the column exists
      const createdAtIndex = headers.findIndex(
        (header: string) => header === 'Created At',
      );
      if (createdAtIndex !== -1) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      this.logger.debug('Row data to be inserted:', rowData);

      // Append the row
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Borrowers!A2:ZZ2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      this.logger.log(`Successfully added new borrower with ID: ${borrowerId}`);

      return {
        ...borrowerData,
        ID: borrowerId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding borrower:', error);
      throw error;
    }
  }

  async updateBorrower(id: string, updateData: any) {
    try {
      this.logger.log(`Updating borrower ${id} in sheets`);

      // First, find the row number for this ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Borrowers!A:A', // Only get ID column
      });

      const rows = response.data.values;
      const rowIndex = rows.findIndex((row) => row[0] === id);

      if (rowIndex === -1) {
        throw new Error('Borrower not found');
      }

      // Get headers
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Borrowers!A1:ZZ1',
      });

      const headers = headerResponse.data.values[0];

      // Get current row data
      const currentDataResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Borrowers!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
      });

      const currentData = currentDataResponse.data.values[0];

      // Create updated row data
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });

      // Update the row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Borrowers!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [updatedRowData],
        },
      });

      this.logger.log(`Successfully updated borrower ${id} in sheets`);
      return { id, ...updateData };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Error updating borrower ${id} in sheets:`,
        errorMessage,
      );
      throw new Error(`Failed to update borrower: ${errorMessage}`);
    }
  }

  async getSheetData(sheetName: string): Promise<any[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `${sheetName}!A:ZZ`,
      });

      return response.data.values || [];
    } catch (error) {
      this.logger.error(`Error fetching data from sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async appendRow(sheetName: string, rowData: any): Promise<void> {
    try {
      // First get headers to ensure correct column order
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `${sheetName}!A1:ZZ1`,
      });

      if (!headerResponse.data.values || !headerResponse.data.values[0]) {
        throw new Error(`No headers found in sheet ${sheetName}`);
      }

      const headers = headerResponse.data.values[0];

      // Create row data in the same order as headers
      const orderedRowData = headers.map((header) => rowData[header] || '');

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `${sheetName}!A2:ZZ2`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [orderedRowData],
        },
      });
    } catch (error) {
      this.logger.error(`Error appending row to sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async updateRow(
    sheetName: string,
    id: string,
    rowData: any[],
  ): Promise<void> {
    try {
      this.logger.log(`Updating row in sheet ${sheetName} with ID: ${id}`);

      // First, find the row number for this ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `${sheetName}!A:A`, // Only get ID column
      });

      const rows = response.data.values;
      const rowIndex = rows.findIndex((row) => row[0] === id);

      if (rowIndex === -1) {
        throw new Error(`Row with ID ${id} not found in sheet ${sheetName}`);
      }

      // Update the row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `${sheetName}!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });

      this.logger.log(
        `Successfully updated row in sheet ${sheetName} with ID: ${id}`,
      );
    } catch (error) {
      this.logger.error(`Error updating row in sheet ${sheetName}:`, error);
      throw error;
    }
  }
}
