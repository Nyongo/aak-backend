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
        range: 'Borrowers!A:AG',
      });

      this.logger.debug('Google Sheets response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data ? 'Data received' : 'No data',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        this.logger.warn('No data found in the Borrowers sheet');
        return [];
      }

      const headers = rows[0];
      this.logger.debug('Sheet headers:', headers);

      // Find relevant column indices
      const sslIdIndex = headers.findIndex((header) => header === 'SSL ID');

      this.logger.debug('Column indices:', {
        sslIdIndex,
      });

      if (sslIdIndex === -1) {
        throw new Error('Required column (SSL ID) not found in sheet');
      }

      // Filter rows if SSL ID is provided
      let filteredRows = rows.slice(1);
      if (sslId) {
        filteredRows = filteredRows.filter((row) => {
          const isMatch = row[sslIdIndex] === sslId;
          this.logger.debug(`Row match check:`, {
            rowSslId: row[sslIdIndex],
            providedSslId: sslId,
            isMatch,
          });
          return isMatch;
        });
      }

      this.logger.debug(
        `Found ${filteredRows.length} borrowers${sslId ? ` for SSL ID ${sslId}` : ''}`,
      );

      // Convert rows to objects
      return filteredRows.map((row) => {
        const borrower: any = {};
        headers.forEach((header: string, index: number) => {
          if (row[index]) {
            borrower[header] = row[index];
          }
        });
        return borrower;
      });
    } catch (error) {
      throw error;
    }
  }

  async getDirectors(borrowerId?: string): Promise<any[]> {
    try {
      this.logger.log(
        `Fetching directors${borrowerId ? ` for borrower ID: ${borrowerId}` : ''}`,
      );

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID, // Users sheet
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

      // Filter rows for directors
      let filteredRows = rows.slice(1).filter((row) => {
        const isDirector = row[typeIndex]?.toLowerCase() === 'director';
        const isMatch = borrowerId ? row[borrowerIdIndex] === borrowerId : true;
        const finalMatch = isDirector && isMatch;

        this.logger.debug(`Row match check:`, {
          rowBorrowerId: row[borrowerIdIndex],
          rowType: row[typeIndex],
          providedBorrowerId: borrowerId,
          isDirector,
          isMatch,
          finalMatch,
        });
        return finalMatch;
      });

      this.logger.debug(
        `Found ${filteredRows.length} directors${borrowerId ? ` for borrower ${borrowerId}` : ''}`,
      );

      // Convert rows to objects
      return filteredRows.map((row) => {
        const director: any = {};
        headers.forEach((header: string, index: number) => {
          if (row[index]) {
            director[header] = row[index];
          }
        });
        return director;
      });
    } catch (error) {
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
      this.logger.log(`Updating borrower with ID: ${id}`);

      // Get all data to find the row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Borrowers!A:ZZ',
      });

      const rows = response.data.values;
      const headers = rows[0];

      // Find ID column index
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }

      // Find the row for this borrower
      const rowIndex = rows.findIndex((row) => row[idIndex] === id);
      if (rowIndex === -1) {
        throw new Error('Borrower not found');
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
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Borrowers!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });

      return {
        ...updateData,
        ID: id,
      };
    } catch (error) {
      this.logger.error('Error updating borrower:', error);
      throw error;
    }
  }

  async addDirector(directorData: any): Promise<any> {
    try {
      this.logger.log('Adding new director');

      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID, // Users sheet
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

      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID, // Users sheet
        range: 'Users!A2:ZZ2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      // Get the updated sheet data to find the new row
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID, // Users sheet
        range: 'Users!A:ZZ',
      });

      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];

      // Find the ID column index
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const nameIndex = updatedHeaders.findIndex((header) => header === 'Name');
      const borrowerIdIndex = updatedHeaders.findIndex(
        (header) => header === 'Borrower ID',
      );

      // Find the newly added row by matching the data
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowName = nameIndex !== -1 ? row[nameIndex] : '';
        const rowBorrowerId =
          borrowerIdIndex !== -1 ? row[borrowerIdIndex] : '';

        if (
          rowName === directorData.Name &&
          rowBorrowerId === directorData['Borrower ID']
        ) {
          newRowIndex = i;
          break;
        }
      }

      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }

      return {
        ...directorData,
        ID: generatedId,
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
        spreadsheetId: this.BORROWERS_SHEET_ID, // Users sheet
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
        spreadsheetId: this.BORROWERS_SHEET_ID, // Users sheet
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

  async getSheetData(
    sheetName: string,
    useDb2?: boolean,
    customRange?: string,
  ): Promise<any[]> {
    try {
      const range = customRange || `${sheetName}!A:ZZ`;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: useDb2
          ? this.BORROWERS_SHEET_ID_2
          : this.BORROWERS_SHEET_ID,
        range,
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

      this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
      this.logger.debug(`Row data: ${JSON.stringify(rowData)}`);
      this.logger.debug(`Ordered row data: ${JSON.stringify(orderedRowData)}`);

      // Get the current data to find the last row
      const currentDataResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
      });

      const currentRows = currentDataResponse.data.values || [];
      const lastRow = currentRows.length + 1;

      this.logger.debug(`Appending to row ${lastRow} in sheet ${sheetName}`);

      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A${lastRow}:ZZ${lastRow}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'OVERWRITE',
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

      // Get all data from the sheet to find the row with the ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:ZZ`, // Get all rows dynamically
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error(`No data found in sheet ${sheetName}`);
      }

      // Find the row that contains the ID in any column
      let rowIndex = -1;
      this.logger.debug(`Searching for ID: ${id} in sheet ${sheetName}`);
      this.logger.debug(`Total rows in sheet: ${rows.length}`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row) {
          // Log the first few rows for debugging
          if (i < 5) {
            this.logger.debug(`Row ${i}: ${JSON.stringify(row.slice(0, 5))}`);
          }

          // Check if any cell matches the ID (with type conversion)
          const found = row.some((cell) => {
            const cellStr = String(cell || '');
            const idStr = String(id);
            const matches = cellStr === idStr;
            if (matches) {
              this.logger.debug(
                `Found ID ${id} in row ${i} at column ${row.indexOf(cell)}`,
              );
            }
            return matches;
          });

          if (found) {
            rowIndex = i;
            break;
          }
        }
      }

      if (rowIndex === -1) {
        this.logger.error(
          `ID ${id} not found in any row. Available IDs in first 10 rows:`,
        );
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const row = rows[i];
          if (row && row.length > 0) {
            this.logger.error(`Row ${i} first cell: ${row[0]}`);
          }
        }
        throw new Error(`Row with ID ${id} not found in sheet ${sheetName}`);
      }

      this.logger.log(`Found row at index ${rowIndex + 1} for ID ${id}`);

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

      // Get all data from the sheet to find the row with the ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:ZZ`, // Get all rows dynamically
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error(`No data found in sheet ${sheetName}`);
      }

      // Find the row that contains the ID in any column
      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.some((cell) => cell === id)) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        throw new Error(`Row with ID ${id} not found in sheet ${sheetName}`);
      }

      this.logger.log(`Found row at index ${rowIndex + 1} for ID ${id}`);

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
      this.logger.debug(
        `Formulas found:`,
        formulas.filter((f) => f && typeof f === 'string' && f.startsWith('=')),
      );

      const formulaSourceRow = 2; // Formulas are copied from row 2
      const formulaRegex = new RegExp(`\\b([A-Z]+)${formulaSourceRow}\\b`, 'g');

      // Map rowData object to an array in the correct order, preserving and updating formulas
      const finalRowData = headers.map((header, index) => {
        const providedData = rowData[header];

        // If data is provided and not empty, use it
        if (
          providedData !== undefined &&
          providedData !== null &&
          providedData !== ''
        ) {
          return providedData;
        } else if (
          formulas[index] &&
          typeof formulas[index] === 'string' &&
          formulas[index].startsWith('=')
        ) {
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

      // Debug: Show which formulas were used
      const usedFormulas = finalRowData
        .map((value, index) => {
          if (value && typeof value === 'string' && value.startsWith('=')) {
            return `Column ${index} (${headers[index]}): ${value}`;
          }
          return null;
        })
        .filter(Boolean);

      this.logger.debug('Formulas used in final row:', usedFormulas);

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

  /**
   * Get CRB consents from Google Sheets
   */
  async getCrbConsents(borrowerId?: string): Promise<any[]> {
    try {
      this.logger.log(
        `Fetching CRB consents${borrowerId ? ` for borrower ID: ${borrowerId}` : ''}`,
      );

      const response = await this.getSheetData('CRB Consent');
      if (!response || !response.length) {
        this.logger.warn('No data found in the CRB Consent sheet');
        return [];
      }

      const headers = response[0];
      this.logger.debug('Sheet headers:', headers);

      // Find relevant column indices
      const borrowerIdIndex = headers.findIndex(
        (header) => header === 'Borrower ID',
      );

      this.logger.debug('Column indices:', {
        borrowerIdIndex,
      });

      if (borrowerIdIndex === -1) {
        throw new Error('Required column (Borrower ID) not found in sheet');
      }

      // Filter rows for the specified borrower if provided
      let filteredRows = response.slice(1);
      if (borrowerId) {
        filteredRows = filteredRows.filter((row) => {
          const isMatch = row[borrowerIdIndex] === borrowerId;
          this.logger.debug(`Row match check:`, {
            rowBorrowerId: row[borrowerIdIndex],
            providedBorrowerId: borrowerId,
            isMatch,
          });
          return isMatch;
        });
      }

      this.logger.debug(`Found ${filteredRows.length} CRB consents`);

      // Convert rows to objects
      return filteredRows.map((row) => {
        const consent: any = {};
        headers.forEach((header: string, index) => {
          if (row[index]) {
            consent[header] = row[index];
          }
        });
        return consent;
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add CRB consent to Google Sheets
   */
  async addCrbConsent(consentData: any): Promise<any> {
    try {
      this.logger.log('Adding new CRB consent');

      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'CRB Consent!A1:ZZ1',
      });

      if (!headerResponse.data.values || !headerResponse.data.values[0]) {
        throw new Error('Failed to get headers from CRB Consent sheet');
      }

      const headers = headerResponse.data.values[0];

      // Prepare row data
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index) => {
        if (consentData[header] !== undefined) {
          rowData[index] = consentData[header];
        }
      });

      // Add Created At if exists
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'CRB Consent!A2:ZZ2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      // Get the updated sheet data to find the new row
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'CRB Consent!A:ZZ',
      });

      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];

      // Find the ID column index
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const borrowerIdIndex = updatedHeaders.findIndex(
        (header) => header === 'Borrower ID',
      );

      // Find the newly added row by matching the data
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowBorrowerId =
          borrowerIdIndex !== -1 ? row[borrowerIdIndex] : '';

        if (rowBorrowerId === consentData['Borrower ID']) {
          newRowIndex = i;
          break;
        }
      }

      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }

      return {
        ...consentData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding CRB consent:', error);
      throw error;
    }
  }

  /**
   * Add CRB consent to Google Sheets with a specific ID
   */
  async addCrbConsentWithId(
    consentData: any,
    specificId: string,
  ): Promise<any> {
    try {
      this.logger.log(`Adding new CRB consent with specific ID: ${specificId}`);

      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'CRB Consent!A1:ZZ1',
      });

      if (!headerResponse.data.values || !headerResponse.data.values[0]) {
        throw new Error('Failed to get headers from CRB Consent sheet');
      }

      const headers = headerResponse.data.values[0];

      // Prepare row data
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index) => {
        if (consentData[header] !== undefined) {
          rowData[index] = consentData[header];
        }
      });

      // Set the ID column with our specific ID (permanent sheetId)
      // Check for 'id' column with case-insensitive comparison
      const idIndex = headers.findIndex(
        (header) => header && header.toLowerCase().trim() === 'id',
      );
      if (idIndex !== -1) {
        rowData[idIndex] = specificId;
        this.logger.debug(
          `Setting ID column (index ${idIndex}, header: "${headers[idIndex]}") with permanent ID: ${specificId}`,
        );
      } else {
        this.logger.warn(
          'ID column not found in sheet headers. Available headers:',
          headers,
        );
        // Try to find it with exact match as fallback
        const exactIdIndex = headers.findIndex(
          (header) => header === 'ID' || header === 'id' || header === 'Id',
        );
        if (exactIdIndex !== -1) {
          rowData[exactIdIndex] = specificId;
          this.logger.debug(
            `Setting ID column (fallback, index ${exactIdIndex}, header: "${headers[exactIdIndex]}") with permanent ID: ${specificId}`,
          );
        }
      }

      // Add Created At if exists
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'CRB Consent!A2:ZZ2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      return {
        ...consentData,
        ID: specificId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding CRB consent with specific ID:', error);
      throw error;
    }
  }

  /**
   * Update CRB consent in Google Sheets
   */
  async updateCrbConsent(consentId: string, updateData: any): Promise<any> {
    try {
      this.logger.log(`Updating CRB consent ${consentId}`);

      // Get all data to find the row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'CRB Consent!A:ZZ',
      });

      const rows = response.data.values;
      const headers = rows[0];

      // Find ID column index (case-insensitive - handles 'ID', 'id', 'Id')
      let idIndex = headers.findIndex(
        (header) => header && header.toLowerCase().trim() === 'id',
      );
      if (idIndex === -1) {
        // Fallback to exact match
        idIndex = headers.findIndex(
          (header) => header === 'ID' || header === 'id' || header === 'Id',
        );
        if (idIndex === -1) {
          throw new Error('ID column not found in sheet headers');
        }
      }

      // Find the row for this consent
      const rowIndex = rows.findIndex((row) => row[idIndex] === consentId);
      if (rowIndex === -1) {
        throw new Error('CRB consent not found');
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
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `CRB Consent!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });

      return {
        ...updateData,
        ID: consentId,
      };
    } catch (error) {
      this.logger.error('Error updating CRB consent:', error);
      throw error;
    }
  }

  /**
   * Get referrers from Google Sheets
   */
  async getReferrers(schoolId?: string): Promise<any[]> {
    try {
      this.logger.log(
        `Fetching referrers${schoolId ? ` for school ID: ${schoolId}` : ''}`,
      );
      const response = await this.getSheetData('Referrers');
      if (!response || !response.length) {
        this.logger.warn('No data found in the Referrers sheet');
        return [];
      }
      const headers = response[0];
      const schoolIdIndex = headers.findIndex(
        (header) => header === 'School ID',
      );
      if (schoolIdIndex === -1) {
        throw new Error('Required column (School ID) not found in sheet');
      }
      let filteredRows = response.slice(1);
      if (schoolId) {
        filteredRows = filteredRows.filter((row) => {
          const isMatch = row[schoolIdIndex] === schoolId;
          this.logger.debug(`Row match check:`, {
            rowSchoolId: row[schoolIdIndex],
            providedSchoolId: schoolId,
            isMatch,
          });
          return isMatch;
        });
      }
      this.logger.debug(`Found ${filteredRows.length} referrers`);
      return filteredRows.map((row) => {
        const referrer: any = {};
        headers.forEach((header: string, index) => {
          if (row[index]) {
            referrer[header] = row[index];
          }
        });
        return referrer;
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add referrer to Google Sheets
   */
  async addReferrer(referrerData: any): Promise<any> {
    try {
      this.logger.log('Adding new referrer');
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Referrers!A1:ZZ1',
      });
      if (!headerResponse.data.values || !headerResponse.data.values[0]) {
        throw new Error('Failed to get headers from Referrers sheet');
      }
      const headers = headerResponse.data.values[0];
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index) => {
        if (referrerData[header] !== undefined) {
          rowData[index] = referrerData[header];
        }
      });
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1) {
        rowData[createdAtIndex] = new Date().toISOString();
      }
      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Referrers!A2:ZZ2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Referrers!A:ZZ',
      });
      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const schoolIdIndex = updatedHeaders.findIndex(
        (header) => header === 'School ID',
      );
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowSchoolId = schoolIdIndex !== -1 ? row[schoolIdIndex] : '';
        if (rowSchoolId === referrerData['School ID']) {
          newRowIndex = i;
          break;
        }
      }
      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }
      return {
        ...referrerData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding referrer:', error);
      throw error;
    }
  }

  /**
   * Update referrer in Google Sheets
   */
  async updateReferrer(referrerId: string, updateData: any): Promise<any> {
    try {
      this.logger.log(`Updating referrer ${referrerId}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Referrers!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }
      const rowIndex = rows.findIndex((row) => row[idIndex] === referrerId);
      if (rowIndex === -1) {
        throw new Error('Referrer not found');
      }
      const currentData = rows[rowIndex];
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Referrers!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });
      return {
        ...updateData,
        ID: referrerId,
      };
    } catch (error) {
      this.logger.error('Error updating referrer:', error);
      throw error;
    }
  }

  /**
   * Get credit applications from Google Sheets
   */
  async getCreditApplications(borrowerId?: string): Promise<any[]> {
    try {
      this.logger.log(
        `Fetching credit applications${borrowerId ? ` for borrower ID: ${borrowerId}` : ''}`,
      );
      const response = await this.getSheetData('Credit Applications');
      if (!response || !response.length) {
        this.logger.warn('No data found in the Credit Applications sheet');
        return [];
      }
      const headers = response[0];
      const borrowerIdIndex = headers.findIndex(
        (header) => header === 'Borrower ID',
      );
      if (borrowerIdIndex === -1) {
        throw new Error('Required column (Borrower ID) not found in sheet');
      }
      let filteredRows = response.slice(1);
      if (borrowerId) {
        filteredRows = filteredRows.filter((row) => {
          const isMatch = row[borrowerIdIndex] === borrowerId;
          this.logger.debug(`Row match check:`, {
            rowBorrowerId: row[borrowerIdIndex],
            providedBorrowerId: borrowerId,
            isMatch,
          });
          return isMatch;
        });
      }
      this.logger.debug(`Found ${filteredRows.length} credit applications`);
      return filteredRows.map((row) => {
        const creditApplication: any = {};
        headers.forEach((header: string, index) => {
          if (row[index]) {
            creditApplication[header] = row[index];
          }
        });
        return creditApplication;
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add new credit application to Google Sheets
   */
  async addCreditApplication(creditApplicationData: any): Promise<any> {
    try {
      this.logger.log('Adding new credit application');
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Credit Applications!A1:ZZ1',
      });
      if (!headerResponse.data.values || !headerResponse.data.values[0]) {
        throw new Error('Failed to get headers from Credit Applications sheet');
      }
      const headers = headerResponse.data.values[0];
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index) => {
        if (creditApplicationData[header] !== undefined) {
          rowData[index] = creditApplicationData[header];
        }
      });
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1) {
        rowData[createdAtIndex] = new Date().toISOString();
      }
      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Credit Applications!A2:ZZ2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Credit Applications!A:ZZ',
      });
      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const borrowerIdIndex = updatedHeaders.findIndex(
        (header) => header === 'Borrower ID',
      );
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowBorrowerId =
          borrowerIdIndex !== -1 ? row[borrowerIdIndex] : '';
        if (rowBorrowerId === creditApplicationData['Borrower ID']) {
          newRowIndex = i;
          break;
        }
      }
      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }
      return {
        ...creditApplicationData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding credit application:', error);
      throw error;
    }
  }

  /**
   * Add new credit application to Google Sheets with a specific ID
   */
  async addCreditApplicationWithId(
    creditApplicationData: any,
    specificId: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Adding new credit application with specific ID: ${specificId}`,
      );
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Credit Applications!A1:ZZ1',
      });
      if (!headerResponse.data.values || !headerResponse.data.values[0]) {
        throw new Error('Failed to get headers from Credit Applications sheet');
      }
      const headers = headerResponse.data.values[0];
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index) => {
        if (creditApplicationData[header] !== undefined) {
          rowData[index] = creditApplicationData[header];
        }
      });

      // Set the ID column with our specific ID
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex !== -1) {
        rowData[idIndex] = specificId;
      }

      // Add Created At if exists
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Credit Applications!A2:ZZ2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      return {
        ...creditApplicationData,
        ID: specificId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        'Error adding credit application with specific ID:',
        error,
      );
      throw error;
    }
  }

  /**
   * Update credit application in Google Sheets
   */
  async updateCreditApplication(
    creditApplicationId: string,
    updateData: any,
  ): Promise<any> {
    try {
      this.logger.log(`Updating credit application ${creditApplicationId}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Credit Applications!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }
      const rowIndex = rows.findIndex(
        (row) => row[idIndex] === creditApplicationId,
      );
      if (rowIndex === -1) {
        throw new Error('Credit application not found');
      }
      const currentData = rows[rowIndex];
      
      // Find the "Photo of Check" column index for logging
      const photoOfCheckIndex = headers.findIndex(
        (header) => header && header.toLowerCase().trim() === 'photo of check',
      );
      
      // Log the update data to verify "Photo of Check" is included
      this.logger.debug(
        `Updating credit application in sheet - Photo of Check value: ${updateData['Photo of Check']}`,
      );
      if (photoOfCheckIndex !== -1) {
        this.logger.debug(
          `Photo of Check column found at index ${photoOfCheckIndex}, current value: ${currentData[photoOfCheckIndex]}, new value: ${updateData['Photo of Check']}`,
        );
      }
      
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Credit Applications!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });
      
      this.logger.debug(
        `Successfully updated credit application ${creditApplicationId} in sheet`,
      );
      return {
        ...updateData,
        ID: creditApplicationId,
      };
    } catch (error) {
      this.logger.error('Error updating credit application:', error);
      throw error;
    }
  }

  // Active Debt methods
  async getActiveDebts(): Promise<any[]> {
    try {
      this.logger.log('Fetching active debts from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Active Debt!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Active Debt sheet headers:', headers);

      const activeDebts = rows.slice(1).map((row) => {
        const activeDebt = {};
        headers.forEach((header, index) => {
          activeDebt[header] = row[index] || '';
        });
        return activeDebt;
      });
      this.logger.log(
        `Found ${activeDebts.length} active debts in Google Sheets`,
      );
      return activeDebts;
    } catch (error) {
      this.logger.error('Error fetching active debts:', error);
      throw error;
    }
  }

  async addActiveDebt(activeDebtData: any): Promise<any> {
    try {
      this.logger.log('Adding active debt to Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Active Debt!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];

      // Prepare row data with proper column mapping
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index: number) => {
        if (activeDebtData[header] !== undefined) {
          rowData[index] = activeDebtData[header];
        }
      });

      // Debug logging to track column mapping
      this.logger.debug('Active Debt column mapping:', {
        headers: headers,
        activeDebtData: activeDebtData,
        rowData: rowData,
      });

      // Log each header and its corresponding data for detailed debugging
      headers.forEach((header: string, index: number) => {
        this.logger.debug(
          `Column ${index}: "${header}" -> "${activeDebtData[header] || ''}"`,
        );
      });

      // Add Created At if exists and not already set
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1 && !rowData[createdAtIndex]) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Active Debt!A:ZZ',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      // Get the updated sheet data to find the new row
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Active Debt!A:ZZ',
      });

      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];

      // Find the ID column index
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const creditApplicationIdIndex = updatedHeaders.findIndex(
        (header) => header === 'Credit Application ID',
      );
      const debtStatusIndex = updatedHeaders.findIndex(
        (header) => header === 'Debt Status',
      );

      // Find the newly added row by matching the data
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowCreditApplicationId =
          creditApplicationIdIndex !== -1 ? row[creditApplicationIdIndex] : '';
        const rowDebtStatus =
          debtStatusIndex !== -1 ? row[debtStatusIndex] : '';

        if (
          rowCreditApplicationId === activeDebtData['Credit Application ID'] &&
          rowDebtStatus === activeDebtData['Debt Status']
        ) {
          newRowIndex = i;
          break;
        }
      }

      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }

      this.logger.log('Active debt added successfully to Google Sheets');
      return {
        ...activeDebtData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding active debt:', error);
      throw error;
    }
  }

  async updateActiveDebt(activeDebtId: string, updateData: any): Promise<any> {
    try {
      this.logger.log(`Updating active debt ${activeDebtId}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Active Debt!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }
      const rowIndex = rows.findIndex((row) => row[idIndex] === activeDebtId);
      if (rowIndex === -1) {
        throw new Error('Active debt not found');
      }
      const currentData = rows[rowIndex];
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Active Debt!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });
      return {
        ...updateData,
        ID: activeDebtId,
      };
    } catch (error) {
      this.logger.error('Error updating active debt:', error);
      throw error;
    }
  }

  // Debug method to get Active Debt headers
  async getActiveDebtHeaders(): Promise<string[]> {
    try {
      this.logger.log('Fetching Active Debt headers from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Active Debt!A1:ZZ1',
      });
      const headers = response.data.values?.[0] || [];
      this.logger.log('Active Debt headers:', headers);
      return headers;
    } catch (error) {
      this.logger.error('Error fetching Active Debt headers:', error);
      throw error;
    }
  }

  // Fee Plan methods
  async getFeePlans(): Promise<any[]> {
    try {
      this.logger.log('Fetching fee plans from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Fee Plan Documents!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Fee Plan Documents sheet headers:', headers);

      const feePlans = rows.slice(1).map((row) => {
        const feePlan = {};
        headers.forEach((header, index) => {
          feePlan[header] = row[index] || '';
        });
        return feePlan;
      });
      this.logger.log(`Found ${feePlans.length} fee plans in Google Sheets`);
      return feePlans;
    } catch (error) {
      this.logger.error('Error fetching fee plans:', error);
      throw error;
    }
  }

  async addFeePlan(feePlanData: any): Promise<any> {
    try {
      this.logger.log('Adding fee plan to Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Fee Plan Documents!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];

      // Prepare row data with proper column mapping
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index: number) => {
        if (feePlanData[header] !== undefined) {
          rowData[index] = feePlanData[header];
        }
      });

      // Debug logging to track column mapping
      this.logger.debug('Fee Plan Documents column mapping:', {
        headers: headers,
        feePlanData: feePlanData,
        rowData: rowData,
      });

      // Log each header and its corresponding data for detailed debugging
      headers.forEach((header: string, index: number) => {
        this.logger.debug(
          `Column ${index}: "${header}" -> "${feePlanData[header] || ''}"`,
        );
      });

      // Add Created At if exists and not already set
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1 && !rowData[createdAtIndex]) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Fee Plan Documents!A:ZZ',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      // Get the updated sheet data to find the new row
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Fee Plan Documents!A:ZZ',
      });

      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const creditApplicationIdIndex = updatedHeaders.findIndex(
        (header) => header === 'Credit Application ID',
      );
      const schoolYearIndex = updatedHeaders.findIndex(
        (header) => header === 'School Year',
      );

      // Find the newly added row by matching the data
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowCreditApplicationId =
          creditApplicationIdIndex !== -1 ? row[creditApplicationIdIndex] : '';
        const rowSchoolYear =
          schoolYearIndex !== -1 ? row[schoolYearIndex] : '';

        if (
          rowCreditApplicationId === feePlanData['Credit Application ID'] &&
          rowSchoolYear === feePlanData['School Year']
        ) {
          newRowIndex = i;
          break;
        }
      }

      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }

      this.logger.log('Fee plan added successfully to Google Sheets');
      return {
        ...feePlanData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding fee plan:', error);
      throw error;
    }
  }

  async updateFeePlan(feePlanId: string, updateData: any): Promise<any> {
    try {
      this.logger.log(`Updating fee plan ${feePlanId}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Fee Plan Documents!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }
      const rowIndex = rows.findIndex((row) => row[idIndex] === feePlanId);
      if (rowIndex === -1) {
        throw new Error('Fee plan not found');
      }
      const currentData = rows[rowIndex];
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: `Fee Plan Documents!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });
      return {
        ...updateData,
        ID: feePlanId,
      };
    } catch (error) {
      this.logger.error('Error updating fee plan:', error);
      throw error;
    }
  }

  // Payroll methods
  async getPayroll(): Promise<any[]> {
    try {
      this.logger.log('Fetching payroll records from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Payroll!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Payroll sheet headers:', headers);

      const payrollRecords = rows.slice(1).map((row) => {
        const payroll = {};
        headers.forEach((header, index) => {
          payroll[header] = row[index] || '';
        });
        return payroll;
      });
      this.logger.log(
        `Found ${payrollRecords.length} payroll records in Google Sheets`,
      );
      return payrollRecords;
    } catch (error) {
      this.logger.error('Error fetching payroll records:', error);
      throw error;
    }
  }

  async addPayroll(payrollData: any): Promise<any> {
    try {
      this.logger.log('Adding payroll record to Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Payroll!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.debug('Payroll sheet headers:', headers);
      this.logger.debug('Payroll data being added:', payrollData);

      // Prepare row data with proper column mapping - only use existing headers
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index: number) => {
        // Only map data that exists in the payrollData and matches an existing header
        if (payrollData[header] !== undefined && payrollData[header] !== null) {
          rowData[index] = payrollData[header];
        }
      });

      // Debug logging to track column mapping
      this.logger.debug('Payroll column mapping:', {
        headers: headers,
        payrollData: payrollData,
        rowData: rowData,
      });

      // Log each header and its corresponding data for detailed debugging
      headers.forEach((header: string, index: number) => {
        this.logger.debug(
          `Column ${index}: "${header}" -> "${payrollData[header] || ''}"`,
        );
      });

      // Add Created At if exists and not already set
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1 && !rowData[createdAtIndex]) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      // Ensure we're only sending data for existing columns
      // This prevents Google Sheets from creating new columns
      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Payroll!A${rows.length + 1}:${String.fromCharCode(65 + headers.length - 1)}${rows.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      // Get the updated sheet data to find the new row
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Payroll!A:ZZ',
      });

      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const creditApplicationIdIndex = updatedHeaders.findIndex(
        (header) => header === 'Credit Application ID',
      );
      const roleIndex = updatedHeaders.findIndex((header) => header === 'Role');

      // Find the newly added row by matching the data
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowCreditApplicationId =
          creditApplicationIdIndex !== -1 ? row[creditApplicationIdIndex] : '';
        const rowRole = roleIndex !== -1 ? row[roleIndex] : '';

        if (
          rowCreditApplicationId === payrollData['Credit Application ID'] &&
          rowRole === payrollData['Role']
        ) {
          newRowIndex = i;
          break;
        }
      }

      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }

      this.logger.log('Payroll record added successfully to Google Sheets');
      return {
        ...payrollData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding payroll record:', error);
      throw error;
    }
  }

  async updatePayroll(payrollId: string, updateData: any): Promise<any> {
    try {
      this.logger.log(`Updating payroll record ${payrollId}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Payroll!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }
      const rowIndex = rows.findIndex((row) => row[idIndex] === payrollId);
      if (rowIndex === -1) {
        throw new Error('Payroll record not found');
      }
      const currentData = rows[rowIndex];
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Payroll!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });
      return {
        ...updateData,
        ID: payrollId,
      };
    } catch (error) {
      this.logger.error('Error updating payroll record:', error);
      throw error;
    }
  }

  // Enrollment Verification methods
  async getEnrollmentVerifications(): Promise<any[]> {
    try {
      this.logger.log('Fetching enrollment verifications from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Enrollment Reports!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Enrollment Reports sheet headers:', headers);

      const enrollmentVerifications = rows.slice(1).map((row) => {
        const enrollmentVerification = {};
        headers.forEach((header, index) => {
          enrollmentVerification[header] = row[index] || '';
        });
        return enrollmentVerification;
      });
      this.logger.log(
        `Found ${enrollmentVerifications.length} enrollment verifications in Google Sheets`,
      );
      return enrollmentVerifications;
    } catch (error) {
      this.logger.error('Error fetching enrollment verifications:', error);
      throw error;
    }
  }

  async addEnrollmentVerification(
    enrollmentVerificationData: any,
  ): Promise<any> {
    try {
      this.logger.log('Adding enrollment verification to Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Enrollment Reports!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.debug('Enrollment Reports sheet headers:', headers);
      this.logger.debug(
        'Enrollment verification data being added:',
        enrollmentVerificationData,
      );

      // Prepare row data with proper column mapping - only use existing headers
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index: number) => {
        // Only map data that exists in the enrollmentVerificationData and matches an existing header
        if (
          enrollmentVerificationData[header] !== undefined &&
          enrollmentVerificationData[header] !== null
        ) {
          rowData[index] = enrollmentVerificationData[header];
        }
      });

      // Debug logging to track column mapping
      this.logger.debug('Enrollment Reports column mapping:', {
        headers: headers,
        enrollmentVerificationData: enrollmentVerificationData,
        rowData: rowData,
      });

      // Log each header and its corresponding data for detailed debugging
      headers.forEach((header: string, index: number) => {
        this.logger.debug(
          `Column ${index}: "${header}" -> "${enrollmentVerificationData[header] || ''}"`,
        );
      });

      // Add Created At if exists and not already set
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1 && !rowData[createdAtIndex]) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      // Ensure we're only sending data for existing columns
      // This prevents Google Sheets from creating new columns
      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Enrollment Reports!A${rows.length + 1}:${String.fromCharCode(65 + headers.length - 1)}${rows.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      // Get the updated sheet data to find the new row
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Enrollment Reports!A:ZZ',
      });

      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const creditApplicationIdIndex = updatedHeaders.findIndex(
        (header) => header === 'Credit Application ID',
      );

      // Find the newly added row by matching the data
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowCreditApplicationId =
          creditApplicationIdIndex !== -1 ? row[creditApplicationIdIndex] : '';

        if (
          rowCreditApplicationId ===
          enrollmentVerificationData['Credit Application ID']
        ) {
          newRowIndex = i;
          break;
        }
      }

      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }

      this.logger.log(
        'Enrollment verification added successfully to Google Sheets',
      );
      return {
        ...enrollmentVerificationData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding enrollment verification:', error);
      throw error;
    }
  }

  async updateEnrollmentVerification(
    enrollmentVerificationId: string,
    updateData: any,
  ): Promise<any> {
    try {
      this.logger.log(
        `Updating enrollment verification ${enrollmentVerificationId}`,
      );
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Enrollment Reports!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }
      const rowIndex = rows.findIndex(
        (row) => row[idIndex] === enrollmentVerificationId,
      );
      if (rowIndex === -1) {
        throw new Error('Enrollment verification not found');
      }
      const currentData = rows[rowIndex];
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Enrollment Reports!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });
      return {
        ...updateData,
        ID: enrollmentVerificationId,
      };
    } catch (error) {
      this.logger.error('Error updating enrollment verification:', error);
      throw error;
    }
  }

  // Mpesa Bank Statement methods
  async getMpesaBankStatements(): Promise<any[]> {
    try {
      this.logger.log('Fetching mpesa bank statements from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Bank Statements!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Bank Statements sheet headers:', headers);

      const mpesaBankStatements = rows.slice(1).map((row) => {
        const mpesaBankStatement = {};
        headers.forEach((header, index) => {
          mpesaBankStatement[header] = row[index] || '';
        });
        return mpesaBankStatement;
      });
      this.logger.log(
        `Found ${mpesaBankStatements.length} mpesa bank statements in Google Sheets`,
      );
      return mpesaBankStatements;
    } catch (error) {
      this.logger.error('Error fetching mpesa bank statements:', error);
      throw error;
    }
  }

  async addMpesaBankStatement(mpesaBankStatementData: any): Promise<any> {
    try {
      this.logger.log('Adding mpesa bank statement to Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Bank Statements!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];

      // Prepare row data with proper column mapping
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index: number) => {
        if (mpesaBankStatementData[header] !== undefined) {
          rowData[index] = mpesaBankStatementData[header];
        }
      });

      // Debug logging to track column mapping
      this.logger.debug('Bank Statements column mapping:', {
        headers: headers,
        mpesaBankStatementData: mpesaBankStatementData,
        rowData: rowData,
      });

      // Log each header and its corresponding data for detailed debugging
      headers.forEach((header: string, index: number) => {
        this.logger.debug(
          `Column ${index}: "${header}" -> "${mpesaBankStatementData[header] || ''}"`,
        );
      });

      // Add Created At if exists and not already set
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1 && !rowData[createdAtIndex]) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Bank Statements!A:ZZ',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      // Get the updated sheet data to find the new row
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Bank Statements!A:ZZ',
      });

      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const creditApplicationIndex = updatedHeaders.findIndex(
        (header) => header === 'Credit Application',
      );

      // Find the newly added row by matching the data
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowCreditApplication =
          creditApplicationIndex !== -1 ? row[creditApplicationIndex] : '';

        if (
          rowCreditApplication === mpesaBankStatementData['Credit Application']
        ) {
          newRowIndex = i;
          break;
        }
      }

      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }

      this.logger.log(
        'Mpesa bank statement added successfully to Google Sheets',
      );
      return {
        ...mpesaBankStatementData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding mpesa bank statement:', error);
      throw error;
    }
  }

  async updateMpesaBankStatement(
    mpesaBankStatementId: string,
    updateData: any,
  ): Promise<any> {
    try {
      this.logger.log(`Updating mpesa bank statement ${mpesaBankStatementId}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Bank Statements!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }
      const rowIndex = rows.findIndex(
        (row) => row[idIndex] === mpesaBankStatementId,
      );
      if (rowIndex === -1) {
        throw new Error('Mpesa bank statement not found');
      }
      const currentData = rows[rowIndex];
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: `Bank Statements!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });
      return {
        ...updateData,
        ID: mpesaBankStatementId,
      };
    } catch (error) {
      this.logger.error('Error updating mpesa bank statement:', error);
      throw error;
    }
  }

  // Audited Financials methods
  async getAuditedFinancials(): Promise<any[]> {
    try {
      this.logger.log('Fetching audited financials from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Audited Financial Statements!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Audited Financial Statements sheet headers:', headers);

      const auditedFinancials = rows.slice(1).map((row) => {
        const auditedFinancial = {};
        headers.forEach((header, index) => {
          auditedFinancial[header] = row[index] || '';
        });
        return auditedFinancial;
      });
      this.logger.log(
        `Found ${auditedFinancials.length} audited financials in Google Sheets`,
      );
      return auditedFinancials;
    } catch (error) {
      this.logger.error('Error fetching audited financials:', error);
      throw error;
    }
  }

  async addAuditedFinancial(auditedFinancialData: any): Promise<any> {
    try {
      this.logger.log('Adding audited financial to Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Audited Financial Statements!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];

      // Prepare row data with proper column mapping
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index: number) => {
        if (auditedFinancialData[header] !== undefined) {
          rowData[index] = auditedFinancialData[header];
        }
      });

      // Debug logging to track column mapping
      this.logger.debug('Audited Financial Statements column mapping:', {
        headers: headers,
        auditedFinancialData: auditedFinancialData,
        rowData: rowData,
      });

      // Log each header and its corresponding data for detailed debugging
      headers.forEach((header: string, index: number) => {
        this.logger.debug(
          `Column ${index}: "${header}" -> "${auditedFinancialData[header] || ''}"`,
        );
      });

      // Add Created At if exists and not already set
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1 && !rowData[createdAtIndex]) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Audited Financial Statements!A:ZZ',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      // Get the updated sheet data to find the new row and confirm the ID
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Audited Financial Statements!A:ZZ',
      });

      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const creditApplicationIndex = updatedHeaders.findIndex(
        (header) => header === 'Credit Application ID',
      );

      // Find the newly added row by matching the data
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowCreditApplication =
          creditApplicationIndex !== -1 ? row[creditApplicationIndex] : '';

        if (
          rowCreditApplication === auditedFinancialData['Credit Application ID']
        ) {
          newRowIndex = i;
          break;
        }
      }

      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
        this.logger.debug(
          `Found newly added row at index ${newRowIndex} with ID: ${generatedId}`,
        );
      } else {
        this.logger.warn('Could not find newly added row in sheet');
      }

      this.logger.log('Audited financial added successfully to Google Sheets');
      return {
        ...auditedFinancialData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding audited financial:', error);
      throw error;
    }
  }

  async updateAuditedFinancial(
    auditedFinancialId: string,
    updateData: any,
  ): Promise<any> {
    try {
      this.logger.log(`Updating audited financial ${auditedFinancialId}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Audited Financial Statements!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }

      // Debug: Log all IDs in the sheet to see what we're working with
      this.logger.debug(
        `Looking for audited financial ID: ${auditedFinancialId}`,
      );
      this.logger.debug(`Available IDs in sheet:`);
      rows.slice(1).forEach((row, index) => {
        const rowId = row[idIndex];
        this.logger.debug(
          `Row ${index + 1}: ID = "${rowId}" (type: ${typeof rowId})`,
        );
      });

      const rowIndex = rows.findIndex(
        (row) => row[idIndex] === auditedFinancialId,
      );
      if (rowIndex === -1) {
        throw new Error('Audited financial not found');
      }
      const currentData = rows[rowIndex];
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: `Audited Financial Statements!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });
      return {
        ...updateData,
        ID: auditedFinancialId,
      };
    } catch (error) {
      this.logger.error('Error updating audited financial:', error);
      throw error;
    }
  }

  // Student Breakdown methods
  async getStudentBreakdowns(): Promise<any[]> {
    try {
      this.logger.log('Fetching student breakdowns from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Student Breakdown!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Student Breakdown sheet headers:', headers);

      const studentBreakdowns = rows.slice(1).map((row) => {
        const studentBreakdown = {};
        headers.forEach((header, index) => {
          studentBreakdown[header] = row[index] || '';
        });
        return studentBreakdown;
      });
      this.logger.log(
        `Found ${studentBreakdowns.length} student breakdowns in Google Sheets`,
      );
      return studentBreakdowns;
    } catch (error) {
      this.logger.error('Error fetching student breakdowns:', error);
      throw error;
    }
  }

  async addStudentBreakdown(studentBreakdownData: any): Promise<any> {
    try {
      this.logger.log('Adding student breakdown to Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Student Breakdown!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];

      // Prepare row data with proper column mapping
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index: number) => {
        if (studentBreakdownData[header] !== undefined) {
          rowData[index] = studentBreakdownData[header];
        }
      });

      // Debug logging to track column mapping
      this.logger.debug('Student Breakdown column mapping:', {
        headers: headers,
        studentBreakdownData: studentBreakdownData,
        rowData: rowData,
      });

      // Log each header and its corresponding data for detailed debugging
      headers.forEach((header: string, index: number) => {
        this.logger.debug(
          `Column ${index}: "${header}" -> "${studentBreakdownData[header] || ''}"`,
        );
      });

      // Add Created At if exists and not already set
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1 && !rowData[createdAtIndex]) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Student Breakdown!A:ZZ',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      // Get the updated sheet data to find the new row
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Student Breakdown!A:ZZ',
      });

      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const creditApplicationIndex = updatedHeaders.findIndex(
        (header) => header === 'Credit Application',
      );

      // Find the newly added row by matching the data
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowCreditApplication =
          creditApplicationIndex !== -1 ? row[creditApplicationIndex] : '';

        if (
          rowCreditApplication === studentBreakdownData['Credit Application']
        ) {
          newRowIndex = i;
          break;
        }
      }

      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }

      this.logger.log('Student breakdown added successfully to Google Sheets');
      return {
        ...studentBreakdownData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding student breakdown:', error);
      throw error;
    }
  }

  async updateStudentBreakdown(
    studentBreakdownId: string,
    updateData: any,
  ): Promise<any> {
    try {
      this.logger.log(`Updating student breakdown ${studentBreakdownId}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Student Breakdown!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }
      const rowIndex = rows.findIndex(
        (row) => row[idIndex] === studentBreakdownId,
      );
      if (rowIndex === -1) {
        throw new Error('Student breakdown not found');
      }
      const currentData = rows[rowIndex];
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: `Student Breakdown!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });
      return {
        ...updateData,
        ID: studentBreakdownId,
      };
    } catch (error) {
      this.logger.error('Error updating student breakdown:', error);
      throw error;
    }
  }

  // Other Supporting Docs methods
  async getOtherSupportingDocs(): Promise<any[]> {
    try {
      this.logger.log('Fetching other supporting docs from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Other Supporting Documents!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Other Supporting Documents sheet headers:', headers);

      const otherSupportingDocs = rows.slice(1).map((row) => {
        const otherSupportingDoc = {};
        headers.forEach((header, index) => {
          otherSupportingDoc[header] = row[index] || '';
        });
        return otherSupportingDoc;
      });
      this.logger.log(
        `Found ${otherSupportingDocs.length} other supporting docs in Google Sheets`,
      );
      return otherSupportingDocs;
    } catch (error) {
      this.logger.error('Error fetching other supporting docs:', error);
      throw error;
    }
  }

  async addOtherSupportingDoc(otherSupportingDocData: any): Promise<any> {
    try {
      this.logger.log('Adding other supporting doc to Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Other Supporting Documents!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];

      // Prepare row data with proper column mapping
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index: number) => {
        if (otherSupportingDocData[header] !== undefined) {
          rowData[index] = otherSupportingDocData[header];
        }
      });

      // Debug logging to track column mapping
      this.logger.debug('Other Supporting Documents column mapping:', {
        headers: headers,
        otherSupportingDocData: otherSupportingDocData,
        rowData: rowData,
      });

      // Log each header and its corresponding data for detailed debugging
      headers.forEach((header: string, index: number) => {
        this.logger.debug(
          `Column ${index}: "${header}" -> "${otherSupportingDocData[header] || ''}"`,
        );
      });

      // Add Created At if exists and not already set
      const createdAtIndex = headers.findIndex(
        (header) => header === 'Created At',
      );
      if (createdAtIndex !== -1 && !rowData[createdAtIndex]) {
        rowData[createdAtIndex] = new Date().toISOString();
      }

      const appendResponse = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Other Supporting Documents!A:ZZ',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowData],
        },
      });

      // Get the updated sheet data to find the new row
      const updatedResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Other Supporting Documents!A:ZZ',
      });

      const updatedRows = updatedResponse.data.values;
      const updatedHeaders = updatedRows[0];
      const idIndex = updatedHeaders.findIndex((header) => header === 'ID');
      const creditApplicationIndex = updatedHeaders.findIndex(
        (header) => header === 'Credit Application ID',
      );

      // Find the newly added row by matching the data
      let newRowIndex = -1;
      for (let i = 1; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowCreditApplication =
          creditApplicationIndex !== -1 ? row[creditApplicationIndex] : '';

        if (
          rowCreditApplication ===
          otherSupportingDocData['Credit Application ID']
        ) {
          newRowIndex = i;
          break;
        }
      }

      let generatedId = '';
      if (newRowIndex !== -1 && idIndex !== -1) {
        generatedId = updatedRows[newRowIndex][idIndex];
      }

      this.logger.log(
        'Other supporting doc added successfully to Google Sheets',
      );
      return {
        ...otherSupportingDocData,
        ID: generatedId,
        'Created At': new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding other supporting doc:', error);
      throw error;
    }
  }

  async updateOtherSupportingDoc(
    otherSupportingDocId: string,
    updateData: any,
  ): Promise<any> {
    try {
      this.logger.log(`Updating other supporting doc ${otherSupportingDocId}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Other Supporting Documents!A:ZZ',
      });
      const rows = response.data.values;
      const headers = rows[0];
      const idIndex = headers.findIndex((header) => header === 'ID');
      if (idIndex === -1) {
        throw new Error('ID column not found');
      }
      const rowIndex = rows.findIndex(
        (row) => row[idIndex] === otherSupportingDocId,
      );
      if (rowIndex === -1) {
        throw new Error('Other supporting doc not found');
      }
      const currentData = rows[rowIndex];
      const updatedRowData = headers.map((header, index) => {
        return updateData[header] !== undefined
          ? updateData[header]
          : currentData[index] || '';
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: `Other Supporting Documents!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRowData],
        },
      });
      return {
        ...updateData,
        ID: otherSupportingDocId,
      };
    } catch (error) {
      this.logger.error('Error updating other supporting doc:', error);
      throw error;
    }
  }

  // Investment Committee methods
  async getInvestmentCommittees(): Promise<any[]> {
    try {
      this.logger.debug('Fetching investment committee records from sheets');
      const records = await this.getSheetData(
        'Investment Committee',
        false,
        'Investment Committee!A1:ZZ3000',
      );

      this.logger.debug(
        `Raw records from sheets: ${JSON.stringify(records, null, 2)}`,
      );

      if (!records || records.length === 0) {
        this.logger.debug('No investment committee records found in sheets');
        return [];
      }

      const headers = records[0];
      this.logger.debug(`Headers found: ${JSON.stringify(headers, null, 2)}`);

      const data = records.slice(1).map((row) => {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index];
        });
        return record;
      });

      this.logger.debug(`Found ${data.length} investment committee records`);
      return data;
    } catch (error) {
      this.logger.error('Error fetching investment committee records:', error);
      throw error;
    }
  }

  async addInvestmentCommittee(investmentCommitteeData: any): Promise<any> {
    try {
      this.logger.debug(
        'Adding investment committee record to sheets',
        investmentCommitteeData,
      );

      // Get the actual headers from the sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Investment Committee!A1:ZZ1',
      });

      const headers = response.data.values?.[0] || [];
      this.logger.debug(`Headers from sheet: ${JSON.stringify(headers)}`);

      this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
      this.logger.debug(
        `Investment committee data: ${JSON.stringify(investmentCommitteeData)}`,
      );

      // Use appendRowWithFormulas to handle both data and formulas correctly
      await this.appendRowWithFormulas(
        'Investment Committee',
        investmentCommitteeData,
      );

      // Wait a moment for the sheet to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get the newly added record
      const updatedRecords = await this.getInvestmentCommittees();
      this.logger.debug(`Updated records count: ${updatedRecords.length}`);
      this.logger.debug(
        `Looking for record with ID: ${investmentCommitteeData.ID}`,
      );

      const newRecord = updatedRecords.find(
        (record) => record.ID === investmentCommitteeData.ID,
      );

      if (!newRecord) {
        this.logger.warn(
          `Could not find newly added record with ID: ${investmentCommitteeData.ID}`,
        );
        this.logger.debug(
          `Available records: ${JSON.stringify(
            updatedRecords.map((r) => ({
              ID: r.ID,
              'Credit Application ID': r['Credit Application ID'],
            })),
            null,
            2,
          )}`,
        );

        // Return a mock record with the ID to prevent the sync from failing
        return {
          ID: investmentCommitteeData.ID,
          ...investmentCommitteeData,
        };
      }

      this.logger.debug(
        'Successfully added investment committee record to sheets',
      );
      return newRecord;
    } catch (error) {
      this.logger.error(
        'Error adding investment committee record to sheets:',
        error,
      );
      throw error;
    }
  }

  async updateInvestmentCommittee(
    investmentCommitteeId: string,
    updateData: any,
  ): Promise<any> {
    try {
      this.logger.debug(
        `Updating investment committee ${investmentCommitteeId} in sheets`,
      );

      // Get the current data to find the row
      const records = await this.getInvestmentCommittees();
      if (!records || records.length === 0) {
        throw new Error('No investment committee records found');
      }

      const headers = Object.keys(records[0]);
      const recordRow = records.find((row) => row.ID === investmentCommitteeId);

      if (!recordRow) {
        throw new Error(
          `Investment committee ${investmentCommitteeId} not found`,
        );
      }

      // Create updated row data
      const updatedRowData = headers.map((header) => {
        if (updateData[header] !== undefined) {
          return updateData[header];
        }
        return recordRow[header] || '';
      });

      // Update the row
      await this.updateRow(
        'Investment Committee',
        investmentCommitteeId,
        updatedRowData,
      );

      // Get the updated record
      const updatedRecords = await this.getInvestmentCommittees();
      const updatedRecord = updatedRecords.find(
        (row) => row.ID === investmentCommitteeId,
      );

      return updatedRecord;
    } catch (error) {
      this.logger.error(
        `Error updating investment committee ${investmentCommitteeId}:`,
        error,
      );
      throw error;
    }
  }

  async getVendorDisbursementDetails(): Promise<any[]> {
    try {
      this.logger.debug('Fetching vendor disbursement details from sheets');
      const records = await this.getSheetData(
        'Vendor Disbursement Details',
        true,
      );

      if (!records || records.length === 0) {
        this.logger.debug('No vendor disbursement details found in sheets');
        return [];
      }

      const headers = records[0];
      const data = records.slice(1).map((row) => {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index];
        });
        return record;
      });

      this.logger.debug(`Found ${data.length} vendor disbursement details`);
      return data;
    } catch (error) {
      this.logger.error('Error fetching vendor disbursement details:', error);
      throw error;
    }
  }

  async addVendorDisbursementDetail(
    vendorDisbursementDetailData: any,
  ): Promise<any> {
    try {
      this.logger.debug(
        'Adding vendor disbursement detail to sheets',
        vendorDisbursementDetailData,
      );

      await this.appendRow(
        'Vendor Disbursement Details',
        vendorDisbursementDetailData,
        true,
      );

      // Wait a moment for the sheet to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get the newly added record
      const updatedRecords = await this.getVendorDisbursementDetails();
      const newRecord = updatedRecords.find(
        (record) => record.ID === vendorDisbursementDetailData.ID,
      );

      if (!newRecord) {
        this.logger.warn(
          `Could not find newly added record with ID: ${vendorDisbursementDetailData.ID}`,
        );
        return {
          ID: vendorDisbursementDetailData.ID,
          ...vendorDisbursementDetailData,
        };
      }

      this.logger.debug(
        'Successfully added vendor disbursement detail to sheets',
      );
      return newRecord;
    } catch (error) {
      this.logger.error(
        'Error adding vendor disbursement detail to sheets:',
        error,
      );
      throw error;
    }
  }

  async updateVendorDisbursementDetail(
    vendorDisbursementDetailId: string,
    updateData: any,
  ): Promise<any> {
    try {
      this.logger.debug(
        `Updating vendor disbursement detail ${vendorDisbursementDetailId} in sheets`,
      );

      // Get the current data to find the row
      const records = await this.getVendorDisbursementDetails();
      if (!records || records.length === 0) {
        throw new Error('No vendor disbursement details found');
      }

      const headers = Object.keys(records[0]);
      const recordRow = records.find(
        (row) => row.ID === vendorDisbursementDetailId,
      );

      if (!recordRow) {
        throw new Error(
          `Vendor disbursement detail ${vendorDisbursementDetailId} not found`,
        );
      }

      // Create updated row data
      const updatedRowData = headers.map((header) => {
        if (updateData[header] !== undefined) {
          return updateData[header];
        }
        return recordRow[header] || '';
      });

      // Update the row
      await this.updateRow(
        'Vendor Disbursement Details',
        vendorDisbursementDetailId,
        updatedRowData,
        true,
      );

      // Get the updated record
      const updatedRecords = await this.getVendorDisbursementDetails();
      const updatedRecord = updatedRecords.find(
        (row) => row.ID === vendorDisbursementDetailId,
      );

      return updatedRecord;
    } catch (error) {
      this.logger.error(
        `Error updating vendor disbursement detail ${vendorDisbursementDetailId}:`,
        error,
      );
      throw error;
    }
  }

  async getHomeVisits(): Promise<any[]> {
    try {
      this.logger.log('Fetching home visits from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Home Visits!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Home Visits sheet headers:', headers);

      const homeVisits = rows.slice(1).map((row) => {
        const homeVisit = {};
        headers.forEach((header, index) => {
          homeVisit[header] = row[index] || '';
        });
        return homeVisit;
      });
      this.logger.log(
        `Found ${homeVisits.length} home visits in Google Sheets`,
      );
      return homeVisits;
    } catch (error) {
      this.logger.error('Error fetching home visits:', error);
      throw error;
    }
  }

  async addHomeVisit(homeVisitData: any): Promise<any> {
    try {
      this.logger.debug('Adding home visit to sheets', homeVisitData);

      await this.appendRow('Home Visits', homeVisitData);

      // Wait a moment for the sheet to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get the newly added record
      const updatedRecords = await this.getHomeVisits();
      const newRecord = updatedRecords.find(
        (record) => record.ID === homeVisitData.ID,
      );

      if (!newRecord) {
        this.logger.warn(
          `Could not find newly added record with ID: ${homeVisitData.ID}`,
        );
        return {
          ID: homeVisitData.ID,
          ...homeVisitData,
        };
      }

      this.logger.debug('Successfully added home visit to sheets');
      return newRecord;
    } catch (error) {
      this.logger.error('Error adding home visit to sheets:', error);
      throw error;
    }
  }

  async updateHomeVisit(homeVisitId: string, updateData: any): Promise<any> {
    try {
      this.logger.debug(`Updating home visit ${homeVisitId} in sheets`);

      // Get the current data to find the row
      const records = await this.getHomeVisits();
      if (!records || records.length === 0) {
        throw new Error('No home visits found');
      }

      const headers = Object.keys(records[0]);
      const recordRow = records.find((row) => row.ID === homeVisitId);

      if (!recordRow) {
        throw new Error(`Home visit ${homeVisitId} not found`);
      }

      // Create updated row data
      const updatedRowData = headers.map((header) => {
        if (updateData[header] !== undefined) {
          return updateData[header];
        }
        return recordRow[header] || '';
      });

      // Update the row
      await this.updateRow('Home Visits', homeVisitId, updatedRowData);

      // Get the updated record
      const updatedRecords = await this.getHomeVisits();
      const updatedRecord = updatedRecords.find(
        (row) => row.ID === homeVisitId,
      );

      return updatedRecord;
    } catch (error) {
      this.logger.error(`Error updating home visit ${homeVisitId}:`, error);
      throw error;
    }
  }

  async getAssetTitles(): Promise<any[]> {
    try {
      this.logger.log('Fetching asset titles from Google Sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID_2,
        range: 'Asset Titles!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Asset Titles sheet headers:', headers);

      const assetTitles = rows.slice(1).map((row) => {
        const assetTitle = {};
        headers.forEach((header, index) => {
          assetTitle[header] = row[index] || '';
        });
        return assetTitle;
      });
      this.logger.log(
        `Found ${assetTitles.length} asset titles in Google Sheets`,
      );
      return assetTitles;
    } catch (error) {
      this.logger.error('Error fetching asset titles:', error);
      throw error;
    }
  }

  async addAssetTitle(assetTitleData: any): Promise<any> {
    try {
      this.logger.debug('Adding asset title to sheets', assetTitleData);

      await this.appendRow('Asset Titles', assetTitleData, true);

      // Wait a moment for the sheet to update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get the newly added record
      const updatedRecords = await this.getAssetTitles();
      const newRecord = updatedRecords.find(
        (record) => record.ID === assetTitleData.ID,
      );

      if (!newRecord) {
        this.logger.warn(
          `Could not find newly added record with ID: ${assetTitleData.ID}`,
        );
        return {
          ID: assetTitleData.ID,
          ...assetTitleData,
        };
      }

      this.logger.debug('Successfully added asset title to sheets');
      return newRecord;
    } catch (error) {
      this.logger.error('Error adding asset title to sheets:', error);
      throw error;
    }
  }

  async updateAssetTitle(assetTitleId: string, updateData: any): Promise<any> {
    try {
      this.logger.debug(`Updating asset title ${assetTitleId} in sheets`);

      // Get the current data to find the row
      const records = await this.getAssetTitles();
      if (!records || records.length === 0) {
        throw new Error('No asset titles found');
      }

      const headers = Object.keys(records[0]);
      const recordRow = records.find((row) => row.ID === assetTitleId);

      if (!recordRow) {
        throw new Error(`Asset title ${assetTitleId} not found`);
      }

      // Create updated row data
      const updatedRowData = headers.map((header) => {
        if (updateData[header] !== undefined) {
          return updateData[header];
        }
        return recordRow[header] || '';
      });

      // Update the row
      await this.updateRow('Asset Titles', assetTitleId, updatedRowData, true);

      // Get the updated record
      const updatedRecords = await this.getAssetTitles();
      const updatedRecord = updatedRecords.find(
        (row) => row.ID === assetTitleId,
      );

      return updatedRecord;
    } catch (error) {
      this.logger.error(`Error updating asset title ${assetTitleId}:`, error);
      throw error;
    }
  }

  async getContractDetails(): Promise<any[]> {
    try {
      this.logger.debug('Fetching contract details from Google Sheets');

      const rows = await this.getSheetData('Contract Details', false);
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Contract Details sheet headers:', headers);

      const contractDetails = rows.slice(1).map((row) => {
        const contractDetail = {};
        headers.forEach((header, index) => {
          contractDetail[header] = row[index] || '';
        });
        return contractDetail;
      });
      this.logger.log(
        `Found ${contractDetails.length} contract details in Google Sheets`,
      );
      return contractDetails;
    } catch (error) {
      this.logger.error('Error fetching contract details:', error);
      throw error;
    }
  }

  async addContractDetails(contractDetailsData: any): Promise<any> {
    try {
      this.logger.debug(
        'Adding contract details to sheets',
        contractDetailsData,
      );

      await this.appendRow('Contract Details', contractDetailsData);

      // Since sheetIds are permanent, return the data we provided
      // Don't try to fetch back the record as it might not be immediately available
      this.logger.debug('Successfully added contract details to sheets');
      return {
        ID: contractDetailsData.ID,
        ...contractDetailsData,
      };
    } catch (error) {
      this.logger.error('Error adding contract details to sheets:', error);
      throw error;
    }
  }

  async updateContractDetails(
    contractDetailsId: string,
    updateData: any,
  ): Promise<any> {
    try {
      this.logger.debug(
        `Updating contract details ${contractDetailsId} in sheets`,
      );

      // Get the current data to find the row
      const records = await this.getContractDetails();
      if (!records || records.length === 0) {
        throw new Error('No contract details found');
      }

      const headers = Object.keys(records[0]);
      const recordRow = records.find((row) => row.ID === contractDetailsId);

      if (!recordRow) {
        throw new Error(`Contract details ${contractDetailsId} not found`);
      }

      // Create updated row data
      const updatedRowData = headers.map((header) => {
        if (updateData[header] !== undefined) {
          return updateData[header];
        }
        return recordRow[header] || '';
      });

      // Update the row
      await this.updateRow(
        'Contract Details',
        contractDetailsId,
        updatedRowData,
      );

      // Get the updated record
      const updatedRecords = await this.getContractDetails();
      const updatedRecord = updatedRecords.find(
        (row) => row.ID === contractDetailsId,
      );

      return updatedRecord;
    } catch (error) {
      this.logger.error(
        `Error updating contract details ${contractDetailsId}:`,
        error,
      );
      throw error;
    }
  }

  async getCreditApplicationComments(): Promise<any[]> {
    try {
      const rows = await this.getSheetData('Credit Application Comments', true);
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Credit Application Comments sheet headers:', headers);

      const comments = rows.slice(1).map((row) => {
        const comment = {};
        headers.forEach((header, index) => {
          comment[header] = row[index] || '';
        });
        return comment;
      });
      this.logger.log(
        `Found ${comments.length} credit application comments in Google Sheets`,
      );
      return comments;
    } catch (error) {
      this.logger.error('Error fetching credit application comments:', error);
      throw error;
    }
  }

  async addCreditApplicationComment(commentData: any): Promise<any> {
    try {
      this.logger.debug(
        'Adding credit application comment to sheets',
        commentData,
      );

      await this.appendRow('Credit Application Comments', commentData, true);

      // Since sheetIds are permanent, return the data we provided
      // Don't try to fetch back the record as it might not be immediately available
      this.logger.debug(
        'Successfully added credit application comment to sheets',
      );
      return {
        ID: commentData.ID,
        ...commentData,
      };
    } catch (error) {
      this.logger.error(
        'Error adding credit application comment to sheets:',
        error,
      );
      throw error;
    }
  }

  async updateCreditApplicationComment(
    commentId: string,
    updateData: any,
  ): Promise<any> {
    try {
      this.logger.debug(`Updating credit application comment ${commentId}`);
      await this.updateRow(
        'Credit Application Comments',
        commentId,
        updateData,
      );
      return { success: true, message: 'Comment updated successfully' };
    } catch (error) {
      this.logger.error(`Error updating credit application comment:`, error);
      throw error;
    }
  }

  async getFinancialSurveys(): Promise<any[]> {
    try {
      this.logger.debug('Fetching financial surveys from sheets');
      const surveys = await this.getSheetData('Financial Survey');
      this.logger.debug(`Retrieved ${surveys?.length || 0} financial surveys`);
      return surveys;
    } catch (error) {
      this.logger.error('Error fetching financial surveys:', error);
      throw error;
    }
  }

  async addFinancialSurvey(surveyData: any): Promise<any> {
    try {
      this.logger.debug('Adding financial survey to sheets');
      this.logger.debug('Survey data:', surveyData);

      const spreadsheetId = this.BORROWERS_SHEET_ID;
      this.logger.debug(`Spreadsheet ID ${spreadsheetId}`);

      await this.appendRowWithFormulas('Financial Survey', surveyData);
      this.logger.debug('Successfully added financial survey to sheets');
      return surveyData;
    } catch (error) {
      this.logger.error('Error adding financial survey to sheets:', error);
      throw error;
    }
  }

  async updateFinancialSurvey(surveyId: string, updateData: any): Promise<any> {
    try {
      this.logger.debug(`Updating financial survey ${surveyId}`);
      await this.updateRow('Financial Survey', surveyId, updateData);
      return { success: true, message: 'Survey updated successfully' };
    } catch (error) {
      this.logger.error(`Error updating financial survey:`, error);
      throw error;
    }
  }

  async getDirectPaymentSchedules(): Promise<any[]> {
    try {
      this.logger.debug('Fetching direct payment schedules from sheets');
      const schedules = await this.getSheetData('Dir. Payment Schedules');
      this.logger.debug(
        `Retrieved ${schedules?.length || 0} direct payment schedules`,
      );
      return schedules;
    } catch (error) {
      this.logger.error('Error fetching direct payment schedules:', error);
      throw error;
    }
  }

  // async getLoans(): Promise<any[]> {
  //   try {
  //     this.logger.debug('Fetching loans from sheets');
  //     const loans = await this.getSheetData('Loans');
  //     this.logger.debug(`Retrieved ${loans?.length || 0} loans`);
  //     return loans;
  //   } catch (error) {
  //     this.logger.error('Error fetching loans:', error);
  //     throw error;
  //   }
  // }

  async getLoans(): Promise<any[]> {
    try {
      this.logger.log('Fetching loans from sheets');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.BORROWERS_SHEET_ID,
        range: 'Loans!A:ZZ',
      });
      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }
      const headers = rows[0];

      // Log the actual headers from Google Sheets for debugging
      this.logger.log('Loans sheet headers:', headers);

      const loans = rows.slice(1).map((row) => {
        const loan = {};
        headers.forEach((header, index) => {
          loan[header] = row[index] || '';
        });
        return loan;
      });
      this.logger.log(`Found ${loans.length} fee plans in Google Sheets`);
      return loans;
    } catch (error) {
      this.logger.error('Error fetching fee plans:', error);
      throw error;
    }
  }

  async getLoansCount(): Promise<number> {
    try {
      this.logger.debug('Getting loans count from sheets');
      const loans = await this.getSheetData('Loans');
      const count = loans?.length || 0;
      this.logger.debug(`Found ${count} loans in sheets`);
      return count;
    } catch (error) {
      this.logger.error('Error getting loans count:', error);
      throw error;
    }
  }
}
