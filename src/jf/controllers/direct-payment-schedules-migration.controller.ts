import {
  Controller,
  Get,
  Post,
  Query,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DirectPaymentSchedulesDbService } from '../services/direct-payment-schedules-db.service';
import { DirectPaymentSchedulesSyncService } from '../services/direct-payment-schedules-sync.service';

@Controller('jf/direct-payment-schedules-migration')
export class DirectPaymentSchedulesMigrationController {
  private readonly logger = new Logger(
    DirectPaymentSchedulesMigrationController.name,
  );

  constructor(
    private readonly directPaymentSchedulesDbService: DirectPaymentSchedulesDbService,
    private readonly directPaymentSchedulesSyncService: DirectPaymentSchedulesSyncService,
  ) {}

  @Post('import')
  async importFromSheets(@Query('spreadsheetId') spreadsheetId: string) {
    try {
      this.logger.log(`Starting import from Google Sheets: ${spreadsheetId}`);

      if (!spreadsheetId) {
        throw new HttpException(
          'Spreadsheet ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result =
        await this.directPaymentSchedulesSyncService.syncFromGoogleSheets(
          spreadsheetId,
        );

      this.logger.log(`Import completed: ${JSON.stringify(result)}`);
      return {
        message: 'Import completed successfully',
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error during import:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(
        `Import failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status')
  async getMigrationStatus(@Query('spreadsheetId') spreadsheetId: string) {
    try {
      this.logger.log(
        `Getting migration status for spreadsheet: ${spreadsheetId}`,
      );

      if (!spreadsheetId) {
        throw new HttpException(
          'Spreadsheet ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const syncStatus =
        await this.directPaymentSchedulesSyncService.getSyncStatus(
          spreadsheetId,
        );

      return {
        message: 'Migration status retrieved successfully',
        ...syncStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting migration status:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(
        `Failed to get migration status: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('preview')
  async previewSheetData(@Query('spreadsheetId') spreadsheetId: string) {
    try {
      this.logger.log(
        `Previewing sheet data for spreadsheet: ${spreadsheetId}`,
      );

      if (!spreadsheetId) {
        throw new HttpException(
          'Spreadsheet ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const sheetData =
        await this.directPaymentSchedulesSyncService.getSheetData(
          spreadsheetId,
        );

      if (!sheetData || sheetData.length === 0) {
        return {
          message: 'No data found in sheet',
          data: [],
          count: 0,
        };
      }

      // Return first 10 records as preview
      const previewData = sheetData.slice(0, 10);

      return {
        message: 'Sheet data preview retrieved successfully',
        data: previewData,
        totalCount: sheetData.length,
        previewCount: previewData.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error previewing sheet data:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(
        `Failed to preview sheet data: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('validate')
  async validateSheetData(@Query('spreadsheetId') spreadsheetId: string) {
    try {
      this.logger.log(
        `Validating sheet data for spreadsheet: ${spreadsheetId}`,
      );

      if (!spreadsheetId) {
        throw new HttpException(
          'Spreadsheet ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const sheetData =
        await this.directPaymentSchedulesSyncService.getSheetData(
          spreadsheetId,
        );

      if (!sheetData || sheetData.length === 0) {
        return {
          message: 'No data found in sheet',
          valid: false,
          errors: ['Sheet is empty'],
        };
      }

      const validationResults = [];
      let validCount = 0;
      let errorCount = 0;

      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        const rowNumber = i + 2; // +2 because sheets are 1-indexed and we skip header

        const rowValidation = this.validateRow(row, rowNumber);
        validationResults.push(rowValidation);

        if (rowValidation.valid) {
          validCount++;
        } else {
          errorCount++;
        }
      }

      const isValid = errorCount === 0;

      return {
        message: 'Sheet data validation completed',
        valid: isValid,
        totalRows: sheetData.length,
        validRows: validCount,
        errorRows: errorCount,
        validationResults: validationResults.slice(0, 50), // Limit to first 50 results
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error validating sheet data:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new HttpException(
        `Failed to validate sheet data: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private validateRow(row: any, rowNumber: number) {
    const errors = [];

    // Check required fields
    if (!row['Borrower ID'] && !row['School ID'] && !row['Loan ID']) {
      errors.push(
        'At least one of Borrower ID, School ID, or Loan ID is required',
      );
    }

    if (!row['Due Date']) {
      errors.push('Due Date is required');
    }

    if (!row['Amount Due']) {
      errors.push('Amount Due is required');
    }

    // Validate date format (basic check)
    if (row['Due Date'] && !this.isValidDate(row['Due Date'])) {
      errors.push('Due Date format is invalid');
    }

    // Validate numeric fields
    if (row['Amount Due'] && isNaN(parseFloat(row['Amount Due']))) {
      errors.push('Amount Due must be a valid number');
    }

    if (row['Principal Amount'] && isNaN(parseFloat(row['Principal Amount']))) {
      errors.push('Principal Amount must be a valid number');
    }

    if (row['Interest Amount'] && isNaN(parseFloat(row['Interest Amount']))) {
      errors.push('Interest Amount must be a valid number');
    }

    return {
      rowNumber,
      valid: errors.length === 0,
      errors,
      data: row,
    };
  }

  private isValidDate(dateString: string): boolean {
    if (!dateString) return false;

    // Try parsing as ISO date
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) return true;

    // Try parsing as DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);

      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
        return true;
      }
    }

    return false;
  }
}
