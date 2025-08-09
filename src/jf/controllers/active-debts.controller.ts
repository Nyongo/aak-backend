import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Logger,
  Put,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateActiveDebtDto } from '../dto/create-active-debt.dto';
import { ActiveDebtsDbService } from '../services/active-debts-db.service';
import { ActiveDebtsSyncService } from '../services/active-debts-sync.service';
import { FileUploadService } from '../services/file-upload.service';
import { BackgroundUploadService } from '../services/background-upload.service';
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
  private readonly ACTIVE_DEBT_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_ACTIVE_DEBT_FILES_FOLDER_ID;
  private readonly ACTIVE_DEBT_FILES_FOLDER_NAME =
    process.env.GOOGLE_DRIVE_ACTIVE_DEBT_FILES_FOLDER_NAME;
  constructor(
    private readonly activeDebtsDbService: ActiveDebtsDbService,
    private readonly activeDebtsSyncService: ActiveDebtsSyncService,
    private readonly fileUploadService: FileUploadService,
    private readonly backgroundUploadService: BackgroundUploadService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('by-application/:creditApplicationId')
  async getDebtsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      const activeDebts =
        await this.activeDebtsDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      // Convert database records to original sheet format for frontend compatibility
      const activeDebtsWithOriginalKeys = activeDebts.map((debt) => {
        const convertedDebt = {
          ID: debt.sheetId || '',
          'Credit Application ID': debt.creditApplicationId || '',
          'Debt Status': debt.debtStatus || '',
          'Listed on CRB': debt.listedOnCrb || '',
          'Personal Loan or School Loan': debt.personalLoanOrSchoolLoan || '',
          Lender: debt.lender || '',
          'Date Loan Taken': debt.dateLoanTaken || '',
          'Final Due Date': debt.finalDueDate || '',
          'Total Loan Amount': debt.totalLoanAmount?.toString() || '',
          Balance: debt.balance?.toString() || '',
          'Amount Overdue': debt.amountOverdue?.toString() || '',
          'Monthly Payment': debt.monthlyPayment?.toString() || '',
          'Debt Statement': debt.debtStatement || '',
          'Annual Declining Balance Interest Rate':
            debt.annualDecliningBalanceInterestRate?.toString() || '',
          'Is the loan collateralized? ': debt.isLoanCollateralized || '',
          'Type of collateral ': debt.typeOfCollateral || '',
          'What was the loan used for': debt.whatWasLoanUsedFor || '',
          'Created At': debt.createdAt?.toISOString() || '',
          Synced: debt.synced || false,
        };
        return convertedDebt;
      });

      // Add Google Drive links for document columns
      const documentColumns = ['Debt Statement'];
      const activeDebtsWithLinks = await Promise.all(
        activeDebtsWithOriginalKeys.map(async (debt) => {
          const debtWithLinks = { ...debt };
          for (const column of documentColumns) {
            if (debt[column]) {
              const filename = debt[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.ACTIVE_DEBT_FILES_FOLDER_ID,
              );
              debtWithLinks[column] = fileLink;
            }
          }
          return debtWithLinks;
        }),
      );

      return {
        success: true,
        count: activeDebtsWithLinks.length,
        data: activeDebtsWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;

      throw error;
    }
  }

  @Post()
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('Debt Statement'))
  async addActiveDebt(
    @Body() createDto: CreateActiveDebtDto,
    @UploadedFile() debtStatement?: Express.Multer.File,
  ) {
    try {
      // Log the incoming data for debugging
      this.logger.log(
        `Incoming createDto keys: ${Object.keys(createDto).join(', ')}`,
      );
      this.logger.log(
        `Incoming createDto: ${JSON.stringify(createDto, null, 2)}`,
      );
      this.logger.log(
        `File upload info: ${debtStatement ? `File received: ${debtStatement.originalname}, size: ${debtStatement.size}` : 'No file uploaded'}`,
      );
      this.logger.log(
        `Adding new active debt for application: ${createDto['Credit Application ID']}`,
      );

      if (!createDto['Credit Application ID']) {
        return {
          success: false,
          error: 'Credit Application ID is required',
        };
      }

      // Save file locally first for faster response
      let debtStatementPath = '';
      const now = new Date().toISOString();

      if (debtStatement) {
        const customName = `debt_statement_${createDto['Credit Application ID']}`;
        debtStatementPath = await this.fileUploadService.saveFile(
          debtStatement,
          'active-debts',
          customName,
        );
      }

      // Prepare active debt data for Postgres
      const activeDebtDataForDb = {
        sheetId: `AD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Generate temporary sheetId
        creditApplicationId: createDto['Credit Application ID'],
        debtStatus: createDto['Debt Status'],
        listedOnCrb: createDto['Listed on CRB'] || '',
        personalLoanOrSchoolLoan: createDto['Personal Loan or School Loan'],
        lender: createDto['Lender'],
        dateLoanTaken: createDto['Date Loan Taken'] || '',
        finalDueDate: createDto['Final Due Date'] || '',
        totalLoanAmount: createDto['Total Loan Amount']
          ? Number(createDto['Total Loan Amount'])
          : 0,
        balance: createDto['Balance'] ? Number(createDto['Balance']) : 0,
        amountOverdue: createDto['Amount Overdue']
          ? Number(createDto['Amount Overdue'])
          : 0,
        monthlyPayment: createDto['Monthly Payment']
          ? Number(createDto['Monthly Payment'])
          : 0,
        debtStatement: debtStatementPath || '',
        annualDecliningBalanceInterestRate: createDto[
          'Annual Declining Balance Interest Rate'
        ]
          ? Number(createDto['Annual Declining Balance Interest Rate'])
          : 0,
        isLoanCollateralized: createDto['Is the loan collateralized?'] || '',
        typeOfCollateral: createDto['Type of collateral'] || '',
        whatWasLoanUsedFor: createDto['What was the loan used for'],
        synced: false,
        createdAt: now,
      };

      const result =
        await this.activeDebtsDbService.create(activeDebtDataForDb);
      this.logger.log(`Active debt added successfully via Postgres`);

      // Queue file upload to Google Drive with active debt ID for database updates
      if (debtStatement) {
        const customName = `debt_statement_${createDto['Credit Application ID']}`;
        this.backgroundUploadService.queueFileUpload(
          debtStatementPath,
          `${customName}_${Date.now()}.${debtStatement.originalname.split('.').pop()}`,
          this.ACTIVE_DEBT_FILES_FOLDER_ID,
          debtStatement.mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          undefined, // consentId (not applicable)
          undefined, // consentFieldName (not applicable)
          undefined, // referrerId (not applicable)
          undefined, // referrerFieldName (not applicable)
          undefined, // creditApplicationId (not applicable)
          undefined, // creditApplicationFieldName (not applicable)
          result.id, // Pass active debt ID
          'debtStatement', // Pass field name
        );
      }
      console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%', result);
      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'create',
      );

      return {
        success: true,
        data: result,
        message: 'Active debt added successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `========Failed to add active debt: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync for active debt
   */
  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for active debt ${dbId} (${operation})`,
      );
      await this.activeDebtsSyncService.syncActiveDebtById(dbId);
      this.logger.log(
        `Background sync triggered successfully for active debt ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger background sync for active debt ${dbId}: ${error}`,
      );
    }
  }

  @Get()
  async getAllActiveDebts() {
    try {
      this.logger.log('Fetching all active debts');
      const activeDebts = await this.activeDebtsDbService.findAll();

      // Convert database records to original sheet format for frontend compatibility
      const activeDebtsWithOriginalKeys = activeDebts.map((debt) => {
        const convertedDebt = {
          ID: debt.sheetId || '',
          'Credit Application ID': debt.creditApplicationId || '',
          'Debt Status': debt.debtStatus || '',
          'Listed on CRB': debt.listedOnCrb || '',
          'Personal Loan or School Loan': debt.personalLoanOrSchoolLoan || '',
          Lender: debt.lender || '',
          'Date Loan Taken': debt.dateLoanTaken || '',
          'Final Due Date': debt.finalDueDate || '',
          'Total Loan Amount': debt.totalLoanAmount?.toString() || '',
          Balance: debt.balance?.toString() || '',
          'Amount Overdue': debt.amountOverdue?.toString() || '',
          'Monthly Payment': debt.monthlyPayment?.toString() || '',
          'Debt Statement': debt.debtStatement || '',
          'Annual Declining Balance Interest Rate':
            debt.annualDecliningBalanceInterestRate?.toString() || '',
          'Is the loan collateralized? ': debt.isLoanCollateralized || '',
          'Type of collateral ': debt.typeOfCollateral || '',
          'What was the loan used for': debt.whatWasLoanUsedFor || '',
          'Created At': debt.createdAt?.toISOString() || '',
          Synced: debt.synced || false,
        };
        return convertedDebt;
      });

      // Add Google Drive links for document columns
      const documentColumns = ['Debt Statement'];
      const activeDebtsWithLinks = await Promise.all(
        activeDebtsWithOriginalKeys.map(async (debt) => {
          const debtWithLinks = { ...debt };
          for (const column of documentColumns) {
            if (debt[column]) {
              const filename = debt[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.ACTIVE_DEBT_FILES_FOLDER_ID,
              );
              debtWithLinks[column] = fileLink;
            }
          }
          return debtWithLinks;
        }),
      );

      return {
        success: true,
        count: activeDebtsWithLinks.length,
        data: activeDebtsWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all active debts: ${apiError.message}`);
      throw error;
    }
  }

  @Get(':id')
  async getActiveDebtById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching active debt with ID: ${id}`);
      const activeDebt = await this.activeDebtsDbService.findById(id);

      if (!activeDebt) {
        return { success: false, message: 'Active debt not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const activeDebtWithOriginalKeys = {
        ID: activeDebt.sheetId || '',
        'Credit Application ID': activeDebt.creditApplicationId || '',
        'Debt Status': activeDebt.debtStatus || '',
        'Listed on CRB': activeDebt.listedOnCrb || '',
        'Personal Loan or School Loan':
          activeDebt.personalLoanOrSchoolLoan || '',
        Lender: activeDebt.lender || '',
        'Date Loan Taken': activeDebt.dateLoanTaken || '',
        'Final Due Date': activeDebt.finalDueDate || '',
        'Total Loan Amount': activeDebt.totalLoanAmount?.toString() || '',
        Balance: activeDebt.balance?.toString() || '',
        'Amount Overdue': activeDebt.amountOverdue?.toString() || '',
        'Monthly Payment': activeDebt.monthlyPayment?.toString() || '',
        'Debt Statement': activeDebt.debtStatement || '',
        'Annual Declining Balance Interest Rate':
          activeDebt.annualDecliningBalanceInterestRate?.toString() || '',
        'Is the loan collateralized? ': activeDebt.isLoanCollateralized || '',
        'Type of collateral ': activeDebt.typeOfCollateral || '',
        'What was the loan used for': activeDebt.whatWasLoanUsedFor || '',
        'Created At': activeDebt.createdAt?.toISOString() || '',
        Synced: activeDebt.synced || false,
      };

      // Add Google Drive links for document columns
      const documentColumns = ['Debt Statement'];
      const activeDebtWithLinks = { ...activeDebtWithOriginalKeys };
      for (const column of documentColumns) {
        if (activeDebtWithLinks[column]) {
          const filename = activeDebtWithLinks[column].split('/').pop();
          const fileLink = await this.googleDriveService.getFileLink(
            filename,
            this.ACTIVE_DEBT_FILES_FOLDER_ID,
          );
          activeDebtWithLinks[column] = fileLink;
        }
      }

      return { success: true, data: activeDebtWithLinks };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching active debt ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Post('sync/:id')
  async syncActiveDebtById(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync requested for active debt: ${id}`);
      const result = await this.activeDebtsSyncService.syncActiveDebtById(
        parseInt(id),
      );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync active debt ${id}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllActiveDebts() {
    try {
      this.logger.log('Manual sync requested for all active debts');
      const result = await this.activeDebtsSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to sync all active debts: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncActiveDebtsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync requested for active debts by credit application: ${creditApplicationId}`,
      );
      const result =
        await this.activeDebtsSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync active debts for credit application ${creditApplicationId}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Get('debug/headers')
  async getActiveDebtHeaders() {
    try {
      this.logger.log('Debug: Fetching Active Debt headers');
      const headers = await this.sheetsService.getActiveDebtHeaders();
      return {
        success: true,
        headers: headers,
        message: 'Active Debt headers retrieved successfully',
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to get Active Debt headers: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('debug/test-mapping')
  async testColumnMapping() {
    try {
      this.logger.log('Debug: Testing Active Debt column mapping');

      // Get the actual headers from Google Sheets
      const headers = await this.sheetsService.getActiveDebtHeaders();

      // Create a test data object with all possible fields
      const testData = {
        ID: 'TEST-123',
        'Credit Application ID': 'CA-TEST-123',
        'Debt Status': 'Active',
        'Listed on CRB': 'Yes',
        'Personal Loan or School Loan': 'School Loan',
        Lender: 'Test Bank',
        'Date Loan Taken': '2025-01-01',
        'Final Due Date': '2026-01-01',
        'Total Loan Amount': '50000',
        Balance: '45000',
        'Amount Overdue': '0',
        'Monthly Payment': '5000',
        'Debt Statement': 'test_statement.pdf',
        'Annual Declining Balance Interest Rate': '12.5',
        'Is the loan collateralized? ': 'No',
        'Type of collateral ': '',
        'What was the loan used for': 'School fees',
        'Created At': new Date().toISOString(),
      };

      // Test the mapping logic
      const rowData = new Array(headers.length).fill('');
      headers.forEach((header: string, index: number) => {
        if (testData[header] !== undefined) {
          rowData[index] = testData[header];
        }
      });

      return {
        success: true,
        headers: headers,
        testData: testData,
        mappedRowData: rowData,
        message: 'Column mapping test completed',
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to test column mapping: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('Debt Statement'))
  async updateActiveDebt(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateActiveDebtDto>,
    @UploadedFile() debtStatement?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating active debt with ID: ${id}`);

      // Find the existing active debt by sheetId (since the id parameter is the sheetId)
      const existingActiveDebt =
        await this.activeDebtsDbService.findBySheetId(id);
      if (!existingActiveDebt) {
        return { success: false, error: 'Active debt not found' };
      }

      // Handle debt statement upload if provided
      let debtStatementPath = existingActiveDebt.debtStatement || '';

      if (debtStatement) {
        const customName = `debt_statement_${updateData['Credit Application ID'] || existingActiveDebt.creditApplicationId}`;
        debtStatementPath = await this.fileUploadService.saveFile(
          debtStatement,
          'active-debts',
          customName,
        );

        // Queue file upload to Google Drive
        this.backgroundUploadService.queueFileUpload(
          debtStatementPath,
          `${customName}_${Date.now()}.${debtStatement.originalname.split('.').pop()}`,
          this.ACTIVE_DEBT_FILES_FOLDER_ID,
          debtStatement.mimetype,
          undefined, // directorId (not applicable)
          undefined, // fieldName (not applicable)
          undefined, // consentId (not applicable)
          undefined, // consentFieldName (not applicable)
          undefined, // referrerId (not applicable)
          undefined, // referrerFieldName (not applicable)
          undefined, // creditApplicationId (not applicable)
          undefined, // creditApplicationFieldName (not applicable)
          existingActiveDebt.id, // Pass active debt ID
          'debtStatement', // Pass field name
        );
      }

      // Prepare update data
      const updateDataForDb = {
        creditApplicationId:
          updateData['Credit Application ID'] ||
          existingActiveDebt.creditApplicationId,
        debtStatus: updateData['Debt Status'] || existingActiveDebt.debtStatus,
        listedOnCrb:
          updateData['Listed on CRB'] || existingActiveDebt.listedOnCrb,
        personalLoanOrSchoolLoan:
          updateData['Personal Loan or School Loan'] ||
          existingActiveDebt.personalLoanOrSchoolLoan,
        lender: updateData['Lender'] || existingActiveDebt.lender,
        dateLoanTaken:
          updateData['Date Loan Taken'] || existingActiveDebt.dateLoanTaken,
        finalDueDate:
          updateData['Final Due Date'] || existingActiveDebt.finalDueDate,
        totalLoanAmount: updateData['Total Loan Amount']
          ? Number(updateData['Total Loan Amount'])
          : existingActiveDebt.totalLoanAmount,
        balance: updateData['Balance']
          ? Number(updateData['Balance'])
          : existingActiveDebt.balance,
        amountOverdue: updateData['Amount Overdue']
          ? Number(updateData['Amount Overdue'])
          : existingActiveDebt.amountOverdue,
        monthlyPayment: updateData['Monthly Payment']
          ? Number(updateData['Monthly Payment'])
          : existingActiveDebt.monthlyPayment,
        debtStatement: debtStatementPath,
        annualDecliningBalanceInterestRate: updateData[
          'Annual Declining Balance Interest Rate'
        ]
          ? Number(updateData['Annual Declining Balance Interest Rate'])
          : existingActiveDebt.annualDecliningBalanceInterestRate,
        isLoanCollateralized:
          updateData['Is the loan collateralized?'] ||
          existingActiveDebt.isLoanCollateralized,
        typeOfCollateral:
          updateData['Type of collateral'] ||
          existingActiveDebt.typeOfCollateral,
        whatWasLoanUsedFor:
          updateData['What was the loan used for'] ||
          existingActiveDebt.whatWasLoanUsedFor,
        synced: false, // Mark as unsynced to trigger sync
      };

      const result = await this.activeDebtsDbService.update(
        id,
        updateDataForDb,
      );
      this.logger.log(`Active debt updated successfully via Postgres`);

      // Trigger background sync
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'update',
      );

      return {
        success: true,
        data: result,
        message: 'Active debt updated successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to update active debt: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
