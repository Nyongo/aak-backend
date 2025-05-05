import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/audited-financials')
export class AuditedFinancialsController {
  private readonly logger = new Logger(AuditedFinancialsController.name);
  private readonly SHEET_NAME = 'Audited Financial Statements';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createFinancialStatement(
    @Body()
    createDto: {
      creditApplicationId: string;
      statementType: string;
      notes: string;
    },
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      // Generate unique ID for the financial statement
      const id = `FIN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

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

      // Upload file to Google Drive if provided
      let fileUrl = '';
      if (file) {
        fileUrl = await this.googleDriveService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
        );
      }

      const rowData = {
        ID: id,
        'Credit Application ID': createDto.creditApplicationId,
        'Statement Type': createDto.statementType,
        Notes: createDto.notes,
        File: fileUrl,
        'Created At': createdAt,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Financial statement record created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating financial statement record: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getFinancialsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching financial statements for application ID: ${creditApplicationId}`,
      );

      const statements = await this.sheetsService.getSheetData(this.SHEET_NAME);
      this.logger.debug(`Retrieved ${statements?.length || 0} rows from sheet`);

      if (!statements || statements.length === 0) {
        this.logger.debug('No financial statements found in sheet');
        return { success: true, count: 0, data: [] };
      }

      const headers = statements[0];
      this.logger.debug(`Sheet headers: ${headers.join(', ')}`);

      const applicationIdIndex = headers.indexOf('Credit Application ID');
      this.logger.debug(
        `Credit Application ID column index: ${applicationIdIndex}`,
      );

      if (applicationIdIndex === -1) {
        this.logger.warn('Credit Application ID column not found in sheet');
        return {
          success: false,
          message: 'Credit Application ID column not found',
          data: [],
        };
      }

      const filteredData = statements
        .slice(1)
        .filter((row) => {
          const matches = row[applicationIdIndex] === creditApplicationId;
          this.logger.debug(
            `Row ${row[0]} application ID: ${row[applicationIdIndex]}, matches: ${matches}`,
          );
          return matches;
        })
        .map((row) => {
          const statement = {};
          headers.forEach((header, index) => {
            statement[header] = row[index];
          });
          return statement;
        });

      this.logger.debug(`Found ${filteredData.length} matching statements`);

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching financial statements for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getFinancialById(@Param('id') id: string) {
    try {
      const statements = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!statements || statements.length === 0) {
        return { success: false, message: 'No financial statements found' };
      }

      const headers = statements[0];
      const idIndex = headers.indexOf('ID');
      const statementRow = statements.find((row) => row[idIndex] === id);

      if (!statementRow) {
        return { success: false, message: 'Financial statement not found' };
      }

      const statement = {};
      headers.forEach((header, index) => {
        statement[header] = statementRow[index];
      });

      return { success: true, data: statement };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching financial statement ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllFinancials() {
    try {
      this.logger.debug('Fetching all financial statements');

      const statements = await this.sheetsService.getSheetData(this.SHEET_NAME);
      this.logger.debug(`Retrieved ${statements?.length || 0} rows from sheet`);

      if (!statements || statements.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = statements[0];
      this.logger.debug(`Sheet headers: ${headers.join(', ')}`);

      const data = statements.slice(1).map((row) => {
        const statement = {};
        headers.forEach((header, index) => {
          statement[header] = row[index];
        });
        return statement;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all financial statements: ${apiError.message}`,
      );
      throw error;
    }
  }
}
