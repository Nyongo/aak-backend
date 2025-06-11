import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  Body,
  Logger,
  Put,
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
  private readonly financialRecordsFilesFolder = 'Financial Records_Files_';
  private readonly financialRecordsImagesFolder = 'Financial Records_Images';
  private readonly GOOGLE_DRIVE_FINANCIAL_RECORDS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_FINANCIAL_RECORDS_IMAGES_FOLDER_ID;
  private readonly GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID;
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
      let statementFileName = '';
      if (files.statement?.[0]) {
        const statement = files.statement[0];
        const timestamp = new Date().getTime();
        statementFileName = `stmt_${createDto.creditApplicationId}_${timestamp}.${statement.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          statement.buffer,
          statementFileName,
          statement.mimetype,
          this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID,
        );
      }

      let convertedExcelFileName = '';
      if (files.convertedExcelFile?.[0]) {
        const excelFile = files.convertedExcelFile[0];
        const timestamp = new Date().getTime();
        convertedExcelFileName = `stmt_converted_${createDto.creditApplicationId}_${timestamp}.${excelFile.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          excelFile.buffer,
          convertedExcelFileName,
          excelFile.mimetype,
          this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID,
        );
      }

      const rowData = {
        ID: id,
        'Credit Application': createDto.creditApplicationId,
        'Personal Or Business Account': createDto.personalOrBusinessAccount,
        Type: createDto.type,
        'Account Details': createDto.accountDetails,
        Description: createDto.description,
        Statement: statementFileName
          ? `${this.financialRecordsFilesFolder}/${statementFileName}`
          : '',
        'Statement Start Date': createDto.statementStartDate,
        'Statement End Date': createDto.statementEndDate,
        'Total Revenue': createDto.totalRevenue,
        'Converted Excel File': convertedExcelFileName
          ? `${this.financialRecordsFilesFolder}/${convertedExcelFileName}`
          : '',
        'Created At': createdAt,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData, true);

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

      const statements = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
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

      const documentColumns = ['Statement', 'Converted Excel File'];
      const datasWithLinks = await Promise.all(
        filteredData.map(async (director) => {
          const dataWithLinks = { ...director };
          for (const column of documentColumns) {
            if (director[column]) {
              let folderId = '';
              if (column == 'Statement') {
                folderId = this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID;
              } else if (column == 'Converted Excel File') {
                folderId = this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID;
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

      const statements = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
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

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'statement', maxCount: 1 },
      { name: 'convertedExcelFile', maxCount: 1 },
    ]),
  )
  async updateStatement(
    @Param('id') id: string,
    @Body()
    updateDto: {
      creditApplicationId?: string;
      personalOrBusinessAccount?: string;
      type?: string;
      accountDetails?: string;
      description?: string;
      statementStartDate?: string;
      statementEndDate?: string;
      totalRevenue?: number;
    },
    @UploadedFiles()
    files: {
      statement?: Express.Multer.File[];
      convertedExcelFile?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating bank statement with ID: ${id}`);

      // First verify the statement exists
      const statements = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
      if (!statements || statements.length === 0) {
        return { success: false, message: 'No bank statements found' };
      }

      const headers = statements[0];
      const idIndex = headers.indexOf('ID');
      const statementRow = statements.find((row) => row[idIndex] === id);

      if (!statementRow) {
        return { success: false, message: 'Bank statement not found' };
      }

      // Upload statement file if provided

      let statementFileName = '';
      if (files.statement?.[0]) {
        const statement = files.statement[0];
        const timestamp = new Date().getTime();
        statementFileName = `stmt_${updateDto.creditApplicationId}_${timestamp}.${statement.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          statement.buffer,
          statementFileName,
          statement.mimetype,
          this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID,
        );
      }

      // Upload converted Excel file if provided
      let convertedExcelFileName = '';
      if (files.convertedExcelFile?.[0]) {
        const excelFile = files.convertedExcelFile[0];
        const timestamp = new Date().getTime();
        convertedExcelFileName = `stmt_converted_${updateDto.creditApplicationId}_${timestamp}.${excelFile.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          excelFile.buffer,
          convertedExcelFileName,
          excelFile.mimetype,
          this.GOOGLE_DRIVE_FINANCIAL_RECORDS_FILES_FOLDER_ID,
        );
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        if (header === 'Statement' && statementFileName) {
          return statementFileName
            ? `${this.financialRecordsFilesFolder}/${statementFileName}`
            : '';
        }
        if (header === 'Converted Excel File' && convertedExcelFileName) {
          return convertedExcelFileName
            ? `${this.financialRecordsFilesFolder}/${convertedExcelFileName}`
            : '';
        }
        if (header === 'Credit Application' && updateDto.creditApplicationId) {
          return updateDto.creditApplicationId;
        }
        if (
          header === 'Personal Or Business Account' &&
          updateDto.personalOrBusinessAccount
        ) {
          return updateDto.personalOrBusinessAccount;
        }
        if (header === 'Type' && updateDto.type) {
          return updateDto.type;
        }
        if (header === 'Account Details' && updateDto.accountDetails) {
          return updateDto.accountDetails;
        }
        if (header === 'Description' && updateDto.description) {
          return updateDto.description;
        }
        if (header === 'Statement Start Date' && updateDto.statementStartDate) {
          return updateDto.statementStartDate;
        }
        if (header === 'Statement End Date' && updateDto.statementEndDate) {
          return updateDto.statementEndDate;
        }
        if (
          header === 'Total Revenue' &&
          updateDto.totalRevenue !== undefined
        ) {
          return updateDto.totalRevenue;
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
        message: 'Bank statement updated successfully',
        data: updatedStatement,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating bank statement: ${apiError.message}`);
      throw error;
    }
  }
}
