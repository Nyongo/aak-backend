import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateActiveDebtDto } from '../dto/create-active-debt.dto';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/active-debts')
export class ActiveDebtsController {
  private readonly logger = new Logger(ActiveDebtsController.name);
  private readonly SHEET_NAME = 'Active Debt';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('by-application/:creditApplicationId')
  async getDebtsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Fetching active debts for credit application: ${creditApplicationId}`,
      );
      const debts = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!debts || debts.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = debts[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      if (applicationIdIndex === -1) {
        throw new Error('Credit Application ID column not found in sheet');
      }

      const filteredData = debts
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const debt = {};
          headers.forEach((header, index) => {
            debt[header] = row[index];
          });
          return debt;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching debts for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('debtStatement'))
  async addActiveDebt(
    @Body() createDto: CreateActiveDebtDto,
    @UploadedFile() debtStatement?: Express.Multer.File,
  ) {
    try {
      this.logger.log(
        `Adding new active debt for application: ${createDto['Credit Application ID']}`,
      );

      let debtStatementUrl = '';
      if (debtStatement) {
        const timestamp = new Date().getTime();
        const filename = `debt_statement_${createDto['Credit Application ID']}_${timestamp}.${debtStatement.originalname.split('.').pop()}`;

        debtStatementUrl = await this.googleDriveService.uploadFile(
          debtStatement.buffer,
          filename,
          debtStatement.mimetype,
        );
      }

      const id = `AD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const now = new Date().toISOString();

      const rowData = {
        ID: id,
        'Credit Application ID': createDto['Credit Application ID'],
        'Debt Status': createDto['Debt Status'],
        'Listed on CRB': createDto['Listed on CRB'],
        'Personal Loan or School Loan':
          createDto['Personal Loan or School Loan'],
        Lender: createDto['Lender'],
        'Date Loan Taken': createDto['Date Loan Taken'],
        'Final Due Date': createDto['Final Due Date'],
        'Total Loan Amount': createDto['Total Loan Amount'],
        Balance: createDto['Balance'],
        'Amount Overdue': createDto['Amount Overdue'] || 0,
        'Monthly Payment': createDto['Monthly Payment'],
        'Debt Statement': debtStatementUrl,
        'Annual Declining Balance Interest Rate':
          createDto['Annual Declining Balance Interest Rate'],
        'Is the loan collateralized?': createDto['Is the loan collateralized?'],
        'Type of collateral': createDto['Type of collateral'] || '',
        'What was the loan used for': createDto['What was the loan used for'],
        'Created At': now,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Active debt added successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error adding active debt: ${apiError.message}`);
      throw error;
    }
  }
}
