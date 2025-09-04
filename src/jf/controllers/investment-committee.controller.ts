import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Logger,
  Put,
  Delete,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateInvestmentCommitteeDto } from '../dto/create-investment-committee.dto';
import { InvestmentCommitteeDbService } from '../services/investment-committee-db.service';
import { InvestmentCommitteeSyncService } from '../services/investment-committee-sync.service';
import { SheetsService } from '../services/sheets.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/investment-committee')
export class InvestmentCommitteeController {
  private readonly logger = new Logger(InvestmentCommitteeController.name);

  constructor(
    private readonly investmentCommitteeDbService: InvestmentCommitteeDbService,
    private readonly investmentCommitteeSyncService: InvestmentCommitteeSyncService,
    private readonly sheetsService: SheetsService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createInvestmentCommitteeRecord(
    @Body() createDto: CreateInvestmentCommitteeDto,
  ) {
    try {
      this.logger.log('Creating new investment committee record', createDto);

      // Generate temporary sheetId
      const sheetId = `IC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Prepare investment committee data for Postgres
      const investmentCommitteeDataForDb = {
        sheetId,
        creditApplicationId:
          createDto['Credit Application ID'] || createDto.creditApplication,
        sslId: createDto['SSL ID'] || '',
        schoolId: createDto['School ID'] || '',
        typeOfSchool: createDto['Type of School'] || '',
        ageOfSchool: createDto['Age of school'] || '',
        incorporationStructure: createDto['Incorporation Structure'] || '',
        schoolIsProfitable: createDto['School is profitable?'] || '',
        solvencyAssetsLiabilities:
          createDto['Solvency (Assets/Liabilities)'] || '',
        numberOfStudentsPreviousYear:
          createDto['Number of Students the Previous Year'] || '',
        numberOfStudentsFromEnrollmentVerification:
          createDto['Number of Students from Enrollment Verification'] || '',
        growthInPopulation: createDto['Growth in Population'] || '',
        auditedFinancialsProvided:
          createDto['Audited financials provided?'] || '',
        schoolHasBankAccountAndChecks:
          createDto[
            'School has a bank account and checks from that bank account?'
          ] || '',
        assetValueHasIncreasedFromTwoYearsAgo:
          createDto['Asset value has increased from two years ago?'] || '',
        totalAnnualRevenueFromFeesFromStudentBreakdownUnadjusted:
          createDto[
            'Total annual revenue from fees from student breakdown, Unadjusted'
          ] || '',
        annualRevenueFromBankaAndMPesaStatements:
          createDto['Annual revenue from Banka and M Pesa Statements'] || '',
        lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol:
          createDto[
            'Lesser of annual revenue from Banka and M Pesa Statements and 75% collections of school fees'
          ] || '',
        collectionsRate: createDto['Collections Rate'] || '',
        averageSchoolFeesCharged:
          createDto['Average School Fees Charged'] || '',
        schoolSitsOnOwnedLeasedOrRentedLand:
          createDto['School sits on owned, leased, or rented land'] || '',
        totalCashHeldInBankAndMPesaAccounts:
          createDto[
            'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)'
          ] || '',
        totalAnnualSpendingOnSalariesExcludingCooksAndDrivers:
          createDto[
            'Total annual spending on salaries excluding cooks and drivers (KES)'
          ] || '',
        totalAnnualSpendingOnRent:
          createDto['Total annual spending on rent (KES)'] || '',
        totalAnnualOwnersDraw:
          createDto['Total annual owners draw (KES)'] || '',
        totalAnnualDebtPaymentOfSchoolAndDirectors:
          createDto[
            'Total annual debt payment of school and directors (KES)'
          ] || '',
        totalOfSalariesRentDebtAndOwnersDraw:
          createDto['Total of salaries, rent, debt, and owners draw (KES)'] ||
          '',
        annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT:
          createDto[
            'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport'
          ] || '',
        totalAnnualExpensesExcludingFoodAndTransport:
          createDto[
            'Total Annual Expenses Excluding Food and Transport (KES)'
          ] || '',
        annualProfitExcludingFoodAndTransportExpenses:
          createDto[
            'Annual Profit Excluding Food and Transport Expenses (Bank and M Pesa Collections Minus Expenses)'
          ] || '',
        annualTransportExpenseEstimateIncludingDriverSalaries:
          createDto[
            'Annual Transport Expense Estimate Including Driver Salaries (KES)'
          ] || '',
        annualFoodExpenseEstimateIncludingCookSalaries:
          createDto[
            'Annual Food Expense Estimate Including Cook Salaries (KES)'
          ] || '',
        annualProfitIncludingFoodAndTransportExpenses:
          createDto['Annual Profit Including Food and Transport Expenses'] ||
          '',
        monthlyProfitIncludingAllExpenses:
          createDto['Monthly Profit Including all Expenses'] || '',
        lesserOfMonthlyProfitAnd35PercentProfitMargin:
          createDto['Lesser of monthly profit and 35% profit margin'] || '',
        debtRatio: createDto['Debt Ratio'] || '40%',
        loanLengthMonths: createDto['Loan Length (Months)'] || '',
        annualReducingInterestRate: createDto['Annual Reducing Interest Rate']
          ? `${createDto['Annual Reducing Interest Rate']}%`
          : '48%',
        maximumMonthlyPayment: createDto['Maximum Monthly Payment'] || '',
        maximumLoan: createDto['Maximum Loan'] || '',
        annualNonSchoolRevenueGenerated:
          createDto['Annual non school revenue generated  (KES)'] || '',
        annualSponsorshipRevenue:
          createDto['Annual sponsorship revenue (KES)'] || '',
        totalBadDebtOnCrbHeldBySchoolAndDirectors:
          createDto[
            'Total bad debt on CRB held by school and directors (KES)'
          ] || '',
        totalDebtOnCrbFullyPaidOffBySchoolAndDirectors:
          createDto[
            'Total debt on CRB fully paid off by school and directors'
          ] || '',
        totalEstimatedValueOfAssets:
          createDto[
            'Total estimated value of assets held by school and directors (KES)'
          ] || '',
        annualDonationRevenue: createDto['Annual donation revenue'] || '',
        maximumPreviousDaysLate: createDto['Maximum Previous Days Late'] || '',
        numberOfInstallmentsPaidLate:
          createDto['Number of Installments Paid Late'] || '',
        schoolCreditRisk: createDto['School Credit Risk'] || '',
        previousRestructure: createDto['Previous Restructure?'] || '',
        predictedDaysLate: createDto['Predicted Days Late'] || 0,
        currentDebtToIncome: createDto['Current Debt to Income'] || '',
        profitMarginTotalProfitTotalRevenueNotAdjustedDownTo35Percent:
          createDto[
            'Profit Margin (Total Profit/Total Revenue, not adjusted down to 35%)'
          ] || '',
        totalDebt: createDto['Total Debt'] || '',
        collateralCoverageOfLoanAmountRequested:
          createDto['Collateral Coverage of Loan Amount Requested'] || '',
        previousLoansWithJackfruit:
          createDto['Previous Loans with Jackfruit'] || '',
        averageBankBalance: createDto['Average bank balance (KES)'] || '',
        averageBankBalanceTotalUnadjustedRevenue:
          createDto['Average bank balance / total  unadjusted revenue'] || '',
        synced: false,
        createdAt: new Date(),
      };

      const result = await this.investmentCommitteeDbService.create(
        investmentCommitteeDataForDb,
      );
      this.logger.log(
        `Investment committee record added successfully via Postgres`,
      );

      // Trigger background sync
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'create',
      );

      return {
        success: true,
        data: result,
        message: 'Investment committee record created successfully',
        sync: {
          triggered: true,
          status: 'immediate',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Error creating investment committee record: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync for investment committee record
   */
  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for investment committee record ${dbId} (${operation})`,
      );
      await this.investmentCommitteeSyncService.syncInvestmentCommitteeById(
        dbId,
        operation,
      );
      this.logger.log(
        `Background sync triggered successfully for investment committee record ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger background sync for investment committee record ${dbId}: ${error}`,
      );
    }
  }

  @Get('by-application/:creditApplicationId')
  async getRecordsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching investment committee records for application: ${creditApplicationId}`,
      );

      const records =
        await this.investmentCommitteeDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      // Convert database records to original sheet format for frontend compatibility
      const recordsWithOriginalKeys = records.map((record) => {
        // Use the dbToSheetMapping to convert all fields
        const convertedRecord =
          this.investmentCommitteeDbService.convertDbDataToSheet(record);

        // Add additional fields that might not be in the mapping
        convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
        convertedRecord['Synced'] = record.synced || false;

        return convertedRecord;
      });

      return {
        success: true,
        count: recordsWithOriginalKeys.length,
        data: recordsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching investment committee records for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getRecordById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching investment committee record with ID: ${id}`);
      const record = await this.investmentCommitteeDbService.findById(id);

      if (!record) {
        return {
          success: false,
          message: 'Investment committee record not found',
        };
      }

      // Convert database record to original sheet format for frontend compatibility
      const recordWithOriginalKeys =
        this.investmentCommitteeDbService.convertDbDataToSheet(record);

      // Add additional fields that might not be in the mapping
      recordWithOriginalKeys['Created At'] =
        record.createdAt?.toISOString() || '';
      recordWithOriginalKeys['Synced'] = record.synced || false;

      return { success: true, data: recordWithOriginalKeys };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching investment committee record ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllRecords() {
    try {
      this.logger.log('Fetching all investment committee records');
      const records = await this.investmentCommitteeDbService.findAll();

      // Convert database records to original sheet format for frontend compatibility
      const recordsWithOriginalKeys = records.map((record) => {
        // Use the dbToSheetMapping to convert all fields
        const convertedRecord =
          this.investmentCommitteeDbService.convertDbDataToSheet(record);

        // Add additional fields that might not be in the mapping
        convertedRecord['Created At'] = record.createdAt?.toISOString() || '';
        convertedRecord['Synced'] = record.synced || false;

        return convertedRecord;
      });

      return {
        success: true,
        count: recordsWithOriginalKeys.length,
        data: recordsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all investment committee records: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateInvestmentCommitteeRecord(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateInvestmentCommitteeDto>,
  ) {
    try {
      this.logger.log(`Updating investment committee record with ID: ${id}`);

      // Find the existing investment committee record by sheetId (since the id parameter is the sheetId)
      const existingRecord =
        await this.investmentCommitteeDbService.findBySheetId(id);
      if (!existingRecord) {
        return {
          success: false,
          error: 'Investment committee record not found',
        };
      }

      this.logger.log(
        `Updating investment committee record with sheetId: ${id}, database ID: ${existingRecord.id}`,
      );

      // Prepare update data
      const updateDataForDb = {
        creditApplicationId:
          updateDto['Credit Application ID'] ||
          updateDto.creditApplication ||
          existingRecord.creditApplicationId,
        auditedFinancialsProvided:
          updateDto['Audited financials provided?'] ||
          existingRecord.auditedFinancialsProvided,
        schoolHasBankAccountAndChecks:
          updateDto[
            'School has a bank account and checks from that bank account?'
          ] || existingRecord.schoolHasBankAccountAndChecks,
        totalAnnualRevenueFromFeesFromStudentBreakdownUnadjusted:
          updateDto[
            'Total annual revenue from fees from student breakdown, Unadjusted'
          ] ||
          existingRecord.totalAnnualRevenueFromFeesFromStudentBreakdownUnadjusted,
        annualRevenueFromBankaAndMPesaStatements:
          updateDto['Annual revenue from Banka and M Pesa Statements'] ||
          existingRecord.annualRevenueFromBankaAndMPesaStatements,
        lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol:
          updateDto[
            'Lesser of annual revenue from Banka and M Pesa Statements and 75% collections of school fees'
          ] ||
          existingRecord.lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol,
        collectionsRate:
          updateDto['Collections Rate'] || existingRecord.collectionsRate,
        averageSchoolFeesCharged:
          updateDto['Average School Fees Charged'] ||
          existingRecord.averageSchoolFeesCharged,
        schoolSitsOnOwnedLeasedOrRentedLand:
          updateDto['School sits on owned, leased, or rented land'] ||
          existingRecord.schoolSitsOnOwnedLeasedOrRentedLand,
        totalCashHeldInBankAndMPesaAccounts:
          updateDto[
            'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)'
          ] || existingRecord.totalCashHeldInBankAndMPesaAccounts,
        totalAnnualSpendingOnSalariesExcludingCooksAndDrivers:
          updateDto[
            'Total annual spending on salaries excluding cooks and drivers (KES)'
          ] ||
          existingRecord.totalAnnualSpendingOnSalariesExcludingCooksAndDrivers,
        totalAnnualSpendingOnRent:
          updateDto['Total annual spending on rent (KES)'] ||
          existingRecord.totalAnnualSpendingOnRent,
        totalAnnualOwnersDraw:
          updateDto['Total annual owners draw (KES)'] ||
          existingRecord.totalAnnualOwnersDraw,
        totalAnnualDebtPaymentOfSchoolAndDirectors:
          updateDto[
            'Total annual debt payment of school and directors (KES)'
          ] || existingRecord.totalAnnualDebtPaymentOfSchoolAndDirectors,
        totalOfSalariesRentDebtAndOwnersDraw:
          updateDto['Total of salaries, rent, debt, and owners draw (KES)'] ||
          existingRecord.totalOfSalariesRentDebtAndOwnersDraw,
        annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT:
          updateDto[
            'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport'
          ] ||
          existingRecord.annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT,
        totalAnnualExpensesExcludingFoodAndTransport:
          updateDto[
            'Total Annual Expenses Excluding Food and Transport (KES)'
          ] || existingRecord.totalAnnualExpensesExcludingFoodAndTransport,
        annualProfitExcludingFoodAndTransportExpenses:
          updateDto[
            'Annual Profit Excluding Food and Transport Expenses (Bank and M Pesa Collections Minus Expenses)'
          ] || existingRecord.annualProfitExcludingFoodAndTransportExpenses,
        annualTransportExpenseEstimateIncludingDriverSalaries:
          updateDto[
            'Annual Transport Expense Estimate Including Driver Salaries (KES)'
          ] ||
          existingRecord.annualTransportExpenseEstimateIncludingDriverSalaries,
        annualFoodExpenseEstimateIncludingCookSalaries:
          updateDto[
            'Annual Food Expense Estimate Including Cook Salaries (KES)'
          ] || existingRecord.annualFoodExpenseEstimateIncludingCookSalaries,
        annualProfitIncludingFoodAndTransportExpenses:
          updateDto['Annual Profit Including Food and Transport Expenses'] ||
          existingRecord.annualProfitIncludingFoodAndTransportExpenses,
        monthlyProfitIncludingAllExpenses:
          updateDto['Monthly Profit Including all Expenses'] ||
          existingRecord.monthlyProfitIncludingAllExpenses,
        lesserOfMonthlyProfitAnd35PercentProfitMargin:
          updateDto['Lesser of monthly profit and 35% profit margin'] ||
          existingRecord.lesserOfMonthlyProfitAnd35PercentProfitMargin,
        debtRatio: updateDto['Debt Ratio'] || existingRecord.debtRatio,
        loanLengthMonths:
          updateDto['Loan Length (Months)'] || existingRecord.loanLengthMonths,
        annualReducingInterestRate:
          updateDto['Annual Reducing Interest Rate'] ||
          existingRecord.annualReducingInterestRate,
        maximumMonthlyPayment:
          updateDto['Maximum Monthly Payment'] ||
          existingRecord.maximumMonthlyPayment,
        maximumLoan: updateDto['Maximum Loan'] || existingRecord.maximumLoan,
        annualNonSchoolRevenueGenerated:
          updateDto['Annual non school revenue generated  (KES)'] ||
          existingRecord.annualNonSchoolRevenueGenerated,
        annualSponsorshipRevenue:
          updateDto['Annual sponsorship revenue (KES)'] ||
          existingRecord.annualSponsorshipRevenue,
        totalBadDebtOnCrbHeldBySchoolAndDirectors:
          updateDto[
            'Total bad debt on CRB held by school and directors (KES)'
          ] || existingRecord.totalBadDebtOnCrbHeldBySchoolAndDirectors,
        totalDebtOnCrbFullyPaidOffBySchoolAndDirectors:
          updateDto[
            'Total debt on CRB fully paid off by school and directors'
          ] || existingRecord.totalDebtOnCrbFullyPaidOffBySchoolAndDirectors,
        totalEstimatedValueOfAssets:
          updateDto[
            'Total estimated value of assets held by school and directors (KES)'
          ] || existingRecord.totalEstimatedValueOfAssets,
        annualDonationRevenue:
          updateDto['Annual donation revenue'] ||
          existingRecord.annualDonationRevenue,
        maximumPreviousDaysLate:
          updateDto['Maximum Previous Days Late'] ||
          existingRecord.maximumPreviousDaysLate,
        numberOfInstallmentsPaidLate:
          updateDto['Number of Installments Paid Late'] ||
          existingRecord.numberOfInstallmentsPaidLate,
        schoolCreditRisk:
          updateDto['School Credit Risk'] || existingRecord.schoolCreditRisk,
        previousRestructure:
          updateDto['Previous Restructure?'] ||
          existingRecord.previousRestructure,
        predictedDaysLate:
          updateDto['Predicted Days Late'] !== undefined
            ? updateDto['Predicted Days Late']
            : existingRecord.predictedDaysLate,
        currentDebtToIncome:
          updateDto['Current Debt to Income'] ||
          existingRecord.currentDebtToIncome,
        profitMarginTotalProfitTotalRevenueNotAdjustedDownTo35Percent:
          updateDto[
            'Profit Margin (Total Profit/Total Revenue, not adjusted down to 35%)'
          ] ||
          existingRecord.profitMarginTotalProfitTotalRevenueNotAdjustedDownTo35Percent,
        totalDebt: updateDto['Total Debt'] || existingRecord.totalDebt,
        collateralCoverageOfLoanAmountRequested:
          updateDto['Collateral Coverage of Loan Amount Requested'] ||
          existingRecord.collateralCoverageOfLoanAmountRequested,
        previousLoansWithJackfruit:
          updateDto['Previous Loans with Jackfruit'] ||
          existingRecord.previousLoansWithJackfruit,
        averageBankBalance:
          updateDto['Average bank balance (KES)'] ||
          existingRecord.averageBankBalance,
        averageBankBalanceTotalUnadjustedRevenue:
          updateDto['Average bank balance / total  unadjusted revenue'] ||
          existingRecord.averageBankBalanceTotalUnadjustedRevenue,
        synced: false, // Mark as unsynced to trigger sync
      };

      const result = await this.investmentCommitteeDbService.updateById(
        existingRecord.id,
        updateDataForDb,
      );
      this.logger.log(
        `Investment committee record updated successfully via Postgres`,
      );

      // Trigger background sync
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'update',
      );

      return {
        success: true,
        data: result,
        message: 'Investment committee record updated successfully',
        sync: {
          triggered: true,
          status: 'immediate',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to update investment committee record: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Delete(':id')
  async deleteInvestmentCommitteeRecord(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting investment committee record with ID: ${id}`);

      // Find the existing investment committee record by sheetId
      const existingRecord =
        await this.investmentCommitteeDbService.findBySheetId(id);
      if (!existingRecord) {
        return {
          success: false,
          error: 'Investment committee record not found',
        };
      }

      // Delete from Google Sheets if the record has a real sheetId (not temporary)
      if (existingRecord.sheetId && !existingRecord.sheetId.startsWith('IC-')) {
        try {
          this.logger.log(
            `Deleting record from Google Sheets with sheetId: ${existingRecord.sheetId}`,
          );

          // First, let's verify the record exists in sheets
          const sheetsRecords =
            await this.sheetsService.getInvestmentCommittees();
          const recordInSheets = sheetsRecords.find(
            (r) => r.ID === existingRecord.sheetId,
          );

          if (!recordInSheets) {
            this.logger.warn(
              `Record with sheetId ${existingRecord.sheetId} not found in Google Sheets`,
            );
          } else {
            this.logger.log(
              `Found record in sheets: ${JSON.stringify(recordInSheets, null, 2)}`,
            );
          }

          await this.sheetsService.deleteRow(
            'Investment Committee',
            existingRecord.sheetId,
          );
          this.logger.log(`Successfully deleted record from Google Sheets`);
        } catch (sheetsError: unknown) {
          const error = sheetsError as any;
          this.logger.error(
            `Failed to delete from Google Sheets: ${error.message}`,
          );
          // Continue with database deletion even if sheets deletion fails
        }
      } else {
        this.logger.log(
          `Skipping Google Sheets deletion for temporary sheetId: ${existingRecord.sheetId}`,
        );
      }

      // Log the record details before deletion for audit purposes
      this.logger.log(`Deleting record with details:`, {
        id: existingRecord.id,
        sheetId: existingRecord.sheetId,
        creditApplicationId: existingRecord.creditApplicationId,
        createdAt: existingRecord.createdAt,
      });

      // Delete from database
      await this.investmentCommitteeDbService.delete(
        existingRecord.id.toString(),
      );

      return {
        success: true,
        message:
          'Investment committee record deleted successfully from both database and Google Sheets',
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to delete investment committee record: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Delete('bulk/:creditApplicationId')
  async deleteInvestmentCommitteeRecordsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Deleting all investment committee records for application: ${creditApplicationId}`,
      );

      // Find all records for this credit application
      const records =
        await this.investmentCommitteeDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (records.length === 0) {
        return {
          success: false,
          error: 'No investment committee records found for this application',
        };
      }

      let deletedCount = 0;
      let sheetsDeletedCount = 0;
      const errors = [];

      // Delete each record
      for (const record of records) {
        try {
          // Delete from Google Sheets if the record has a real sheetId (not temporary)
          if (record.sheetId && !record.sheetId.startsWith('IC-')) {
            try {
              // First, let's verify the record exists in sheets
              const sheetsRecords =
                await this.sheetsService.getInvestmentCommittees();
              const recordInSheets = sheetsRecords.find(
                (r) => r.ID === record.sheetId,
              );

              if (!recordInSheets) {
                this.logger.warn(
                  `Record with sheetId ${record.sheetId} not found in Google Sheets`,
                );
              } else {
                this.logger.log(
                  `Found record in sheets for deletion: ${record.sheetId}`,
                );
              }

              await this.sheetsService.deleteRow(
                'Investment Committee',
                record.sheetId,
              );
              sheetsDeletedCount++;
              this.logger.log(`Deleted from Google Sheets: ${record.sheetId}`);
            } catch (sheetsError: unknown) {
              const error = sheetsError as any;
              this.logger.error(
                `Failed to delete from Google Sheets: ${error.message}`,
              );
              errors.push(
                `Sheets deletion failed for ${record.sheetId}: ${error.message}`,
              );
            }
          }

          // Delete from database
          await this.investmentCommitteeDbService.delete(record.id.toString());
          deletedCount++;
          this.logger.log(`Deleted from database: ${record.id}`);
        } catch (error: unknown) {
          const dbError = error as any;
          this.logger.error(
            `Failed to delete record ${record.id}: ${dbError.message}`,
          );
          errors.push(
            `Database deletion failed for ${record.id}: ${dbError.message}`,
          );
        }
      }

      return {
        success: true,
        message: `Successfully deleted ${deletedCount} records from database and ${sheetsDeletedCount} from Google Sheets`,
        data: {
          totalRecords: records.length,
          deletedFromDatabase: deletedCount,
          deletedFromSheets: sheetsDeletedCount,
          errors: errors.length > 0 ? errors : undefined,
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to delete investment committee records for application ${creditApplicationId}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  // Sync endpoints
  @Post('sync/:id')
  async syncInvestmentCommitteeById(@Param('id') id: string) {
    try {
      this.logger.log(
        `Manual sync requested for investment committee record: ${id}`,
      );
      const result =
        await this.investmentCommitteeSyncService.syncInvestmentCommitteeById(
          parseInt(id),
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync investment committee record ${id}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllInvestmentCommittees() {
    try {
      this.logger.log(
        'Manual sync requested for all investment committee records',
      );
      const result =
        await this.investmentCommitteeSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync all investment committee records: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncInvestmentCommitteesByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync requested for investment committee records by credit application: ${creditApplicationId}`,
      );
      const result =
        await this.investmentCommitteeSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync investment committee records for credit application ${creditApplicationId}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-calculated-values/:id')
  async syncCalculatedValuesFromSheets(@Param('id') id: string) {
    try {
      this.logger.log(
        `Manually syncing calculated values from sheets for record: ${id}`,
      );

      const record = await this.investmentCommitteeDbService.findById(id);
      if (!record) {
        return {
          success: false,
          error: `Investment committee record ${id} not found`,
        };
      }

      if (!record.sheetId || record.sheetId.startsWith('IC-')) {
        return {
          success: false,
          error: `Record ${id} does not have a valid sheetId`,
        };
      }

      // Call the sync method directly
      await this.investmentCommitteeSyncService.syncCalculatedValuesFromSheets(
        record.sheetId,
        record.id,
      );

      return {
        success: true,
        message: `Calculated values synced successfully for record ${id}`,
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Error syncing calculated values for record ${id}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
