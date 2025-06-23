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
  private readonly BORROWERS_SHEET_ID_2: string;
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
    this.BORROWERS_SHEET_ID_2 = this.configService.get(
      'GOOGLE_SHEETS_BORROWERS_ID_2',
    );
    if (!this.BORROWERS_SHEET_ID || !this.BORROWERS_SHEET_ID_2) {
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

  async getSheetData(sheetName: string, useDb2?: boolean): Promise<any[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: useDb2
          ? this.BORROWERS_SHEET_ID_2
          : this.BORROWERS_SHEET_ID,
        range: `${sheetName}!A:ZZ`,
      });

      return response.data.values || [];
    } catch (error) {
      this.logger.error(`Error fetching data from sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async getSheetFormulas(sheetName: string, row: number): Promise<string[]> {
    try {
      const range = `${sheetName}!A${row}:${row}`;
      this.logger.debug(`Fetching formulas from range: ${range}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range,
        valueRenderOption: 'FORMULA',
      });

      return response.data.values?.[0] || [];
    } catch (error) {
      this.logger.error(
        `Error fetching formulas from sheet ${sheetName}:`,
        error,
      );
      throw error;
    }
  }

  async appendRow(
    sheetName: string,
    rowData: any,
    useDb2?: boolean,
  ): Promise<void> {
    try {
      const spreadsheetId = useDb2
        ? this.BORROWERS_SHEET_ID_2
        : this.BORROWERS_SHEET_ID;
      console.log('Spreadsheet ID', spreadsheetId);
      // First get headers to ensure correct column order
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:ZZ1`,
      });

      if (!headerResponse.data.values || !headerResponse.data.values[0]) {
        throw new Error(`No headers found in sheet ${sheetName}`);
      }

      const headers = headerResponse.data.values[0];

      // Create row data in the same order as headers
      const orderedRowData = headers.map((header) => rowData[header] || '');

      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
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
    useDb2?: boolean,
  ): Promise<void> {
    try {
      this.logger.log(`Updating row in sheet ${sheetName} with ID: ${id}`);
      const spreadsheetId = useDb2
        ? this.BORROWERS_SHEET_ID_2
        : this.BORROWERS_SHEET_ID;
      // Check if id is a number (row number) or a string (row ID)
      const isRowNumber = !isNaN(Number(id));
      let rowIndex: number;

      if (isRowNumber) {
        // If id is a row number, use it directly (subtract 1 for 0-based index)
        rowIndex = Number(id) - 1;
      } else {
        // If id is a row ID, find the row by ID
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:A`, // Only get ID column
        });

        const rows = response.data.values;
        rowIndex = rows.findIndex((row) => row[0] === id);

        if (rowIndex === -1) {
          throw new Error(`Row with ID ${id} not found in sheet ${sheetName}`);
        }
      }

      // Update the row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
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

  async deleteRow(
    sheetName: string,
    id: string,
    useDb2?: boolean,
  ): Promise<void> {
    try {
      this.logger.log(`Deleting row in sheet ${sheetName} with ID: ${id}`);
      const spreadsheetId = useDb2
        ? this.BORROWERS_SHEET_ID_2
        : this.BORROWERS_SHEET_ID;
      // First, find the row number for this ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`, // Only get ID column
      });

      const rows = response.data.values;
      const rowIndex = rows.findIndex((row) => row[0] === id);

      if (rowIndex === -1) {
        throw new Error(`Row with ID ${id} not found in sheet ${sheetName}`);
      }

      // Delete the row by clearing its contents
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
      });

      this.logger.log(
        `Successfully deleted row in sheet ${sheetName} with ID: ${id}`,
      );
    } catch (error) {
      this.logger.error(`Error deleting row in sheet ${sheetName}:`, error);
      throw error;
    }
  }

  // New methods specifically for handling formulas
  async getSheetDataWithFormulas(sheetName: string): Promise<{
    headers: string[];
    formulas: string[];
  }> {
    try {
      // Get headers
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `${sheetName}!A1:ZZ1`,
      });

      if (!headerResponse.data.values || !headerResponse.data.values[0]) {
        throw new Error(`Failed to get headers from sheet: ${sheetName}`);
      }

      const headers = headerResponse.data.values[0];

      // Get formulas from row 2 (assuming formulas are in the second row)
      const formulaResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `${sheetName}!A2:ZZ2`,
        valueRenderOption: 'FORMULA',
      });

      const formulas = formulaResponse.data.values?.[0] || [];

      return { headers, formulas };
    } catch (error) {
      this.logger.error(
        `Error fetching data with formulas from sheet ${sheetName}:`,
        error,
      );
      throw error;
    }
  }

  async appendRowWithFormulas(
    sheetName: string,
    rowData: Record<string, any>,
  ): Promise<void> {
    try {
      this.logger.log(`Appending row with formulas to sheet ${sheetName}`);
      this.logger.debug('Row data:', rowData);

      // Get the current number of rows to determine the new row number
      const sheetStateResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `${sheetName}!A:A`, // Check against column A to get row count
      });
      const newRowNumber = (sheetStateResponse.data.values?.length || 0) + 1;
      this.logger.debug(`New row will be at index: ${newRowNumber}`);

      // Get headers and formulas
      const { headers, formulas } =
        await this.getSheetDataWithFormulas(sheetName);
      this.logger.debug(`Sheet headers for ${sheetName}:`, headers);

      const formulaSourceRow = 2; // Formulas are copied from row 2
      const formulaRegex = new RegExp(`\\b([A-Z]+)${formulaSourceRow}\\b`, 'g');

      // Map rowData object to an array in the correct order, preserving and updating formulas
      const finalRowData = headers.map((header, index) => {
        if (rowData[header] !== undefined) {
          return rowData[header];
        } else if (formulas[index] && formulas[index].startsWith('=')) {
          // If there's a formula in this column and no data provided, update and use it
          const updatedFormula = formulas[index].replace(
            formulaRegex,
            `$1${newRowNumber}`,
          );
          return updatedFormula;
        } else {
          return '';
        }
      });

      this.logger.debug('Final row data array with formulas:', finalRowData);

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED', // This allows formulas to be interpreted
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [finalRowData],
        },
      });

      this.logger.log(
        `Successfully appended row with formulas to sheet ${sheetName}`,
      );
    } catch (error) {
      this.logger.error(
        `Error appending row with formulas to sheet ${sheetName}:`,
        error,
      );
      throw error;
    }
  }
}
