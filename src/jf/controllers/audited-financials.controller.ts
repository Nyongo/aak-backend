import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  Logger,
  Put,
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
  private readonly financialRecordsFolder =
    'Audited Financial Statements_Files_';
  private readonly GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID;
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
      let statementFileName = '';
      if (file) {
        const timestamp = new Date().getTime();
        statementFileName = `stmt_${createDto.creditApplicationId}_${timestamp}.${file.originalname.split('.').pop()}`;
        await this.googleDriveService.uploadFile(
          file.buffer,
          statementFileName,
          file.mimetype,
          this.GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID,
        );
      }

      const rowData = {
        ID: id,
        'Credit Application ID': createDto.creditApplicationId,
        'Statement Type': createDto.statementType,
        Notes: createDto.notes,
        File: statementFileName
          ? `${this.financialRecordsFolder}/${statementFileName}`
          : '',
        'Created At': createdAt,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData, true);

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

      const statements = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
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

      const documentColumns = ['File'];
      const datasWithLinks = await Promise.all(
        filteredData.map(async (director) => {
          const dataWithLinks = { ...director };
          for (const column of documentColumns) {
            if (director[column]) {
              let folderId = '';
              if (column == 'File') {
                folderId =
                  this
                    .GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID;
              }
              const filename = director[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                folderId,
              );
              dataWithLinks[column] = fileLink;
            }
          }
          return dataWithLinks;
        }),
      );

      this.logger.debug(`Found ${filteredData.length} matching statements`);

      return {
        success: true,
        count: filteredData.length,
        data: datasWithLinks,
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

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  async updateFinancialStatement(
    @Param('id') id: string,
    @Body()
    updateDto: {
      creditApplicationId?: string;
      statementType?: string;
      notes?: string;
    },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating financial statement with ID: ${id}`);

      // First verify the statement exists
      const statements = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
      if (!statements || statements.length === 0) {
        return { success: false, message: 'No financial statements found' };
      }

      const headers = statements[0];
      const idIndex = headers.indexOf('ID');
      const statementRow = statements.find((row) => row[idIndex] === id);

      if (!statementRow) {
        return { success: false, message: 'Financial statement not found' };
      }

      // Upload file if provided
      let statementFileName = '';
      if (file) {
        const timestamp = new Date().getTime();
        statementFileName = `stmt_${updateDto.creditApplicationId}_${timestamp}.${file.originalname.split('.').pop()}`;
        await this.googleDriveService.uploadFile(
          file.buffer,
          statementFileName,
          file.mimetype,
          this.GOOGLE_DRIVE_AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_ID,
        );
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        if (header === 'File' && statementFileName) {
          return statementFileName
            ? `${this.financialRecordsFolder}/${statementFileName}`
            : '';
        }
        if (
          header === 'Credit Application ID' &&
          updateDto.creditApplicationId
        ) {
          return updateDto.creditApplicationId;
        }
        if (header === 'Statement Type' && updateDto.statementType) {
          return updateDto.statementType;
        }
        if (header === 'Notes' && updateDto.notes) {
          return updateDto.notes;
        }
        return statementRow[index] || '';
      });

      // Update the row
      await this.sheetsService.updateRow(
        this.SHEET_NAME,
        id,
        updatedRowData,
        true,
      );

      // Get the updated statement record
      const updatedStatement = {};
      headers.forEach((header, index) => {
        updatedStatement[header] = updatedRowData[index];
      });

      return {
        success: true,
        message: 'Financial statement updated successfully',
        data: updatedStatement,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error updating financial statement: ${apiError.message}`,
      );
      throw error;
    }
  }
}
