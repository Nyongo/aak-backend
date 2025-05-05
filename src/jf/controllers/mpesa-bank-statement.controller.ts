import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  Body,
  Logger,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/bank-statements')
export class MpesaBankStatementController {
  private readonly logger = new Logger(MpesaBankStatementController.name);
  private readonly SHEET_NAME = 'Bank Statements';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'statement', maxCount: 1 },
      { name: 'convertedExcelFile', maxCount: 1 },
    ]),
  )
  async createStatement(
    @Body()
    createDto: {
      creditApplicationId: string;
      personalOrBusinessAccount: string;
      type: string;
      accountDetails: string;
      description: string;
      statementStartDate: string;
      statementEndDate: string;
      totalRevenue: number;
    },
    @UploadedFiles()
    files: {
      statement?: Express.Multer.File[];
      convertedExcelFile?: Express.Multer.File[];
    },
  ) {
    try {
      // Generate unique ID for the statement
      const id = `STMT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

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

      // Upload files to Google Drive if provided
      let statementUrl = '';
      let convertedExcelFileUrl = '';

      if (files.statement?.[0]) {
        const statement = files.statement[0];
        statementUrl = await this.googleDriveService.uploadFile(
          statement.buffer,
          statement.originalname,
          statement.mimetype,
        );
      }

      if (files.convertedExcelFile?.[0]) {
        const excelFile = files.convertedExcelFile[0];
        convertedExcelFileUrl = await this.googleDriveService.uploadFile(
          excelFile.buffer,
          excelFile.originalname,
          excelFile.mimetype,
        );
      }

      const rowData = {
        ID: id,
        'Credit Application': createDto.creditApplicationId,
        'Personal Or Business Account': createDto.personalOrBusinessAccount,
        Type: createDto.type,
        'Account Details': createDto.accountDetails,
        Description: createDto.description,
        Statement: statementUrl,
        'Statement Start Date': createDto.statementStartDate,
        'Statement End Date': createDto.statementEndDate,
        'Total Revenue': createDto.totalRevenue,
        'Converted Excel File': convertedExcelFileUrl,
        'Created At': createdAt,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Statement record created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error creating statement record: ${apiError.message}`);
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getStatementsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching statements for application ID: ${creditApplicationId}`,
      );

      const statements = await this.sheetsService.getSheetData(this.SHEET_NAME);
      this.logger.debug(`Retrieved ${statements?.length || 0} rows from sheet`);

      if (!statements || statements.length === 0) {
        this.logger.debug('No statements found in sheet');
        return { success: true, count: 0, data: [] };
      }

      const headers = statements[0];
      this.logger.debug(`Sheet headers: ${headers.join(', ')}`);

      const applicationIdIndex = headers.indexOf('Credit Application');
      this.logger.debug(
        `Credit Application column index: ${applicationIdIndex}`,
      );

      if (applicationIdIndex === -1) {
        this.logger.warn('Credit Application column not found in sheet');
        return {
          success: false,
          message: 'Credit Application column not found',
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
        `Error fetching statements for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getStatementById(@Param('id') id: string) {
    try {
      const statements = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!statements || statements.length === 0) {
        return { success: false, message: 'No statements found' };
      }

      const headers = statements[0];
      const idIndex = headers.indexOf('ID');
      const statementRow = statements.find((row) => row[idIndex] === id);

      if (!statementRow) {
        return { success: false, message: 'Statement not found' };
      }

      const statement = {};
      headers.forEach((header, index) => {
        statement[header] = statementRow[index];
      });

      return { success: true, data: statement };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching statement ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Get()
  async getAllStatements() {
    try {
      this.logger.debug('Fetching all statements');

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
      this.logger.error(`Error fetching all statements: ${apiError.message}`);
      throw error;
    }
  }
}
