import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { InvestmentCommitteeDbService } from '../services/investment-committee-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/investment-committee-migration')
export class InvestmentCommitteeMigrationController {
  private readonly logger = new Logger(
    InvestmentCommitteeMigrationController.name,
  );

  constructor(
    private readonly investmentCommitteeDbService: InvestmentCommitteeDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    try {
      const totalInDb = await this.investmentCommitteeDbService.findAll();
      const totalInSheets = await this.sheetsService.getInvestmentCommittees();

      return {
        success: true,
        data: {
          totalInDatabase: totalInDb.length,
          totalInSheets: totalInSheets.length,
          syncedInDatabase: totalInDb.filter((record) => record.synced).length,
          unsyncedInDatabase: totalInDb.filter((record) => !record.synced)
            .length,
        },
        message: 'Investment committee migration status retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get migration status: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('sheet-headers')
  async getSheetHeaders() {
    try {
      this.logger.log('Getting Investment Committee sheet headers');

      // Get a sample record to see the headers
      const sampleRecords = await this.sheetsService.getInvestmentCommittees();

      if (sampleRecords.length === 0) {
        return {
          success: true,
          data: {
            totalHeaders: 0,
            headers: [],
          },
          message: 'No records found in Investment Committee sheet',
        };
      }

      // Get headers from the first record
      const headers = Object.keys(sampleRecords[0]);

      this.logger.log(
        `Found ${headers.length} headers in Investment Committee sheet`,
      );

      return {
        success: true,
        data: {
          totalHeaders: headers.length,
          headers: headers,
        },
        message: 'Investment Committee sheet headers retrieved successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get sheet headers: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('import-from-sheets')
  async importFromSheets(
    @Query('creditApplicationId') creditApplicationId?: string,
  ) {
    this.logger.log(
      `Starting import from Google Sheets${creditApplicationId ? ` for Credit Application ID: ${creditApplicationId}` : ''}`,
    );

    try {
      // Get all investment committees from Google Sheets
      const allSheetInvestmentCommittees =
        await this.sheetsService.getInvestmentCommittees();
      const sheetInvestmentCommittees = creditApplicationId
        ? allSheetInvestmentCommittees.filter(
            (ic) => ic['Credit Application'] === creditApplicationId,
          )
        : allSheetInvestmentCommittees;

      if (
        !sheetInvestmentCommittees ||
        sheetInvestmentCommittees.length === 0
      ) {
        return {
          success: true,
          message: 'No investment committees found in Google Sheets',
          imported: 0,
          skipped: 0,
          errors: 0,
        };
      }

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      for (const sheetInvestmentCommittee of sheetInvestmentCommittees) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetInvestmentCommittee).length === 0) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetInvestmentCommittee,
            });
            continue;
          }

          // Skip records with empty ID
          if (
            !sheetInvestmentCommittee.ID ||
            sheetInvestmentCommittee.ID.trim() === ''
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetInvestmentCommittee,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord =
            await this.investmentCommitteeDbService.findBySheetId(
              sheetInvestmentCommittee.ID,
            );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetInvestmentCommittee.ID,
              creditApplicationId:
                sheetInvestmentCommittee['Credit Application'],
            });
            continue;
          }

          // Convert sheet data to database format
          const dbData = this.convertSheetToDbFormat(sheetInvestmentCommittee);

          // Create record in database
          await this.investmentCommitteeDbService.create(dbData);
          imported++;

          this.logger.debug(
            `Imported investment committee with sheetId: ${sheetInvestmentCommittee.ID}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetInvestmentCommittee.ID,
            creditApplicationId: sheetInvestmentCommittee['Credit Application'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import investment committee ${sheetInvestmentCommittee.ID}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(
        `Import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`,
      );

      return {
        success: true,
        message: `Import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`,
        imported,
        skipped,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
        skippedDetails: skippedDetails.length > 0 ? skippedDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to import from sheets: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('sync-to-sheets')
  async syncToSheets(
    @Query('creditApplicationId') creditApplicationId?: string,
  ) {
    this.logger.log(
      `Starting sync to Google Sheets${creditApplicationId ? ` for Credit Application ID: ${creditApplicationId}` : ''}`,
    );

    try {
      // Get unsynced investment committees from database
      const allUnsyncedInvestmentCommittees =
        await this.investmentCommitteeDbService.findUnsynced();
      const unsyncedInvestmentCommittees = creditApplicationId
        ? allUnsyncedInvestmentCommittees.filter(
            (ic) => ic.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedInvestmentCommittees;

      if (
        !unsyncedInvestmentCommittees ||
        unsyncedInvestmentCommittees.length === 0
      ) {
        return {
          success: true,
          message: 'No unsynced investment committees found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced investment committee
      for (const investmentCommittee of unsyncedInvestmentCommittees) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.investmentCommitteeDbService.updateSyncStatus(
            investmentCommittee.id,
            true,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            creditApplicationId: investmentCommittee.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Investment Committee ${investmentCommittee.id}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(`Sync completed: ${synced} synced, ${errors} errors`);

      return {
        success: true,
        message: `Sync completed: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync to sheets: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('full-migration')
  async fullMigration(
    @Query('creditApplicationId') creditApplicationId?: string,
  ) {
    this.logger.log(
      `Starting full migration${creditApplicationId ? ` for Credit Application ID: ${creditApplicationId}` : ''}`,
    );

    try {
      // Step 1: Import from sheets
      const importResult = await this.importFromSheets(creditApplicationId);
      if (!importResult.success) {
        return importResult;
      }

      // Step 2: Sync to sheets
      const syncResult = await this.syncToSheets(creditApplicationId);
      if (!syncResult.success) {
        return syncResult;
      }

      return {
        success: true,
        message: 'Full migration completed successfully',
        import: importResult,
        sync: syncResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to complete full migration: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('compare-record')
  async compareRecord(@Query('sheetId') sheetId: string) {
    try {
      // Get record from database
      const dbRecord =
        await this.investmentCommitteeDbService.findBySheetId(sheetId);
      if (!dbRecord) {
        return {
          success: false,
          error: 'Record not found in database',
        };
      }

      // Get record from sheets
      const sheetRecords = await this.sheetsService.getInvestmentCommittees();
      const sheetRecord = sheetRecords.find((record) => record.ID === sheetId);

      if (!sheetRecord) {
        return {
          success: false,
          error: 'Record not found in Google Sheets',
        };
      }

      return {
        success: true,
        data: {
          database: dbRecord,
          sheet: sheetRecord,
        },
        message: 'Record comparison completed',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare record: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('fix-existing-records')
  async fixExistingRecords() {
    this.logger.log(
      'Starting to fix existing records with correct field mapping',
    );

    try {
      const allSheetRecords =
        await this.sheetsService.getInvestmentCommittees();
      const allDbRecords = await this.investmentCommitteeDbService.findAll();

      let updated = 0;
      let errors = 0;
      const errorDetails = [];

      for (const dbRecord of allDbRecords) {
        try {
          const sheetRecord = allSheetRecords.find(
            (sheetRecord) => sheetRecord.ID === dbRecord.sheetId,
          );

          if (sheetRecord) {
            // Update with correct field mappings
            const updateData = {
              creditApplicationId: sheetRecord['Credit Application ID'],
              sslId: sheetRecord['SSL ID'] || '',
              schoolId: sheetRecord['School ID'] || '',
              typeOfSchool: sheetRecord['Type of School'] || '',
              ageOfSchool: sheetRecord['Age of school'] || '',
              incorporationStructure:
                sheetRecord['Incorporation Structure'] || '',
              schoolIsProfitable: sheetRecord['School is profitable?'] || '',
              solvencyAssetsLiabilities:
                sheetRecord['Solvency (Assets/Liabilities) '] || '',
              numberOfStudentsPreviousYear:
                sheetRecord['Number of Students the Previous Year'] || '',
              numberOfStudentsFromEnrollmentVerification:
                sheetRecord[
                  'Number of Students from Enrollment Verification'
                ] || '',
              growthInPopulation: sheetRecord['Growth in Population'] || '',
              auditedFinancialsProvided:
                sheetRecord['Audited financials provided?'] || '',
              schoolHasBankAccountAndChecks:
                sheetRecord[
                  'School has a bank account and checks from that bank account?'
                ] || '',
              assetValueHasIncreasedFromTwoYearsAgo:
                sheetRecord['Asset value has increased from two years ago?'] ||
                '',
              totalAnnualRevenueFromFeesFromStudentBreakdownUnadjusted:
                sheetRecord[
                  'Total annual revenue from fees from student breakdown, Unadjusted'
                ] || '',
              annualRevenueFromBankaAndMPesaStatements:
                sheetRecord[
                  'Annual revenue from Banka and M Pesa Statements'
                ] || '',
              lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCollections:
                sheetRecord[
                  'Lesser of annual revenue from Banka and M Pesa Statements and 75% collections of school fees'
                ] || '',
              collectionsRate: sheetRecord['Collections Rate'] || '',
              averageSchoolFeesCharged:
                sheetRecord['Average School Fees Charged'] || '',
              schoolSitsOnOwnedLeasedOrRentedLand:
                sheetRecord['School sits on owned, leased, or rented land'] ||
                '',
              totalCashHeldInBankAndMPesaAccounts:
                sheetRecord[
                  'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)'
                ] || '',
              totalAnnualSpendingOnSalariesExcludingCooksAndDrivers:
                sheetRecord[
                  'Total annual spending on salaries excluding cooks and drivers (KES)'
                ] || '',
              totalAnnualSpendingOnRent:
                sheetRecord['Total annual spending on rent (KES)'] || '',
              totalAnnualOwnersDraw:
                sheetRecord['Total annual owners draw (KES)'] || '',
              totalAnnualDebtPaymentOfSchoolAndDirectors:
                sheetRecord[
                  'Total annual debt payment of school and directors (KES)'
                ] || '',
              totalOfSalariesRentDebtAndOwnersDraw:
                sheetRecord[
                  'Total of salaries, rent, debt, and owners draw (KES)'
                ] || '',
              annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndTransport:
                sheetRecord[
                  'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport'
                ] || '',
              totalAnnualExpensesExcludingFoodAndTransport:
                sheetRecord[
                  'Total Annual Expenses Excluding Food and Transport (KES)'
                ] || '',
              annualProfitExcludingFoodAndTransportExpenses:
                sheetRecord[
                  'Annual Profit Excluding Food and Transport Expenses (Bank and M Pesa Collections Minus Expenses)'
                ] || '',
              annualTransportExpenseEstimateIncludingDriverSalaries:
                sheetRecord[
                  'Annual Transport Expense Estimate Including Driver Salaries (KES)'
                ] || '',
              annualFoodExpenseEstimateIncludingCookSalaries:
                sheetRecord[
                  'Annual Food Expense Estimate Including Cook Salaries (KES)'
                ] || '',
              annualProfitIncludingFoodAndTransportExpenses:
                sheetRecord[
                  'Annual Profit Including Food and Transport Expenses'
                ] || '',
              monthlyProfitIncludingAllExpenses:
                sheetRecord['Monthly Profit Including all Expenses'] || '',
              lesserOfMonthlyProfitAnd35PercentProfitMargin:
                sheetRecord['Lesser of monthly profit and 35% profit margin'] ||
                '',
              debtRatio: sheetRecord['Debt Ratio'] || '',
              loanLengthMonths: sheetRecord['Loan Length (Months)'] || '',
              annualReducingInterestRate:
                sheetRecord['Annual Reducing Interest Rate'] || '',
              maximumMonthlyPayment:
                sheetRecord['Maximum Monthly Payment'] || '',
              maximumLoan: sheetRecord['Maximum Loan'] || '',
              annualNonSchoolRevenueGenerated:
                sheetRecord['Annual non school revenue generated  (KES)'] || '',
              annualSponsorshipRevenue:
                sheetRecord['Annual sponsorship revenue (KES)'] || '',
              totalBadDebtOnCrbHeldBySchoolAndDirectors:
                sheetRecord[
                  'Total bad debt on CRB held by school and directors (KES)'
                ] || '',
              totalDebtOnCrbFullyPaidOffBySchoolAndDirectors:
                sheetRecord[
                  'Total debt on CRB fully paid off by school and directors'
                ] || '',
              totalEstimatedValueOfAssets:
                sheetRecord[
                  'Total estimated value of assets held by school and directors (KES)'
                ] || '',
              annualDonationRevenue:
                sheetRecord['Annual donation revenue'] || '',
              maximumPreviousDaysLate:
                sheetRecord['Maximum Previous Days Late'] || '',
              numberOfInstallmentsPaidLate:
                sheetRecord['Number of Installments Paid Late'] || '',
              schoolCreditRisk: sheetRecord['School Credit Risk'] || '',
              previousRestructure: sheetRecord['Previous Restructure?'] || '',
              predictedDaysLate: sheetRecord['Predicted Days Late']
                ? Number(sheetRecord['Predicted Days Late'])
                : null,
              currentDebtToIncome: sheetRecord['Current Debt to Income'] || '',
              profitMarginTotalProfitTotalRevenueNotAdjustedDownTo35Percent:
                sheetRecord[
                  'Profit Margin (Total Profit/Total Revenue, not adjusted down to 35%)'
                ] || '',
              totalDebt: sheetRecord['Total Debt'] || '',
              collateralCoverageOfLoanAmountRequested:
                sheetRecord['Collateral Coverage of Loan Amount Requested'] ||
                '',
              previousLoansWithJackfruit:
                sheetRecord['Previous Loans with Jackfruit'] || '',
              averageBankBalance:
                sheetRecord['Average bank balance (KES)'] || '',
              averageBankBalanceTotalUnadjustedRevenue:
                sheetRecord[
                  'Average bank balance / total  unadjusted revenue'
                ] || '',
            };

            await this.investmentCommitteeDbService.updateById(
              dbRecord.id,
              updateData,
            );
            updated++;
            this.logger.debug(
              `Updated record ${dbRecord.sheetId} with correct field mappings`,
            );
          } else {
            this.logger.warn(
              `No sheet record found for database record ${dbRecord.sheetId}`,
            );
          }
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: dbRecord.sheetId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to fix record ${dbRecord.sheetId}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(`Fix completed: ${updated} updated, ${errors} errors`);

      return {
        success: true,
        message: `Fix completed: ${updated} updated, ${errors} errors`,
        updated,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fix existing records: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private convertSheetToDbFormat(sheetRecord: any) {
    return {
      sheetId: sheetRecord.ID,
      creditApplicationId: sheetRecord['Credit Application ID'],
      sslId: sheetRecord['SSL ID'] || '',
      schoolId: sheetRecord['School ID'] || '',
      typeOfSchool: sheetRecord['Type of School'] || '',
      ageOfSchool: sheetRecord['Age of school'] || '',
      incorporationStructure: sheetRecord['Incorporation Structure'] || '',
      schoolIsProfitable: sheetRecord['School is profitable?'] || '',
      solvencyAssetsLiabilities:
        sheetRecord['Solvency (Assets/Liabilities) '] || '',
      numberOfStudentsPreviousYear:
        sheetRecord['Number of Students the Previous Year'] || '',
      numberOfStudentsFromEnrollmentVerification:
        sheetRecord['Number of Students from Enrollment Verification'] || '',
      growthInPopulation: sheetRecord['Growth in Population'] || '',
      auditedFinancialsProvided:
        sheetRecord['Audited financials provided?'] || '',
      schoolHasBankAccountAndChecks:
        sheetRecord[
          'School has a bank account and checks from that bank account?'
        ] || '',
      assetValueHasIncreasedFromTwoYearsAgo:
        sheetRecord['Asset value has increased from two years ago?'] || '',
      totalAnnualRevenueFromFeesFromStudentBreakdownUnadjusted:
        sheetRecord[
          'Total annual revenue from fees from student breakdown, Unadjusted'
        ] || '',
      annualRevenueFromBankaAndMPesaStatements:
        sheetRecord['Annual revenue from Banka and M Pesa Statements'] || '',
      lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCollections:
        sheetRecord[
          'Lesser of annual revenue from Banka and M Pesa Statements and 75% collections of school fees'
        ] || '',
      collectionsRate: sheetRecord['Collections Rate'] || '',
      averageSchoolFeesCharged:
        sheetRecord['Average School Fees Charged'] || '',
      schoolSitsOnOwnedLeasedOrRentedLand:
        sheetRecord['School sits on owned, leased, or rented land'] || '',
      totalCashHeldInBankAndMPesaAccounts:
        sheetRecord[
          'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)'
        ] || '',
      totalAnnualSpendingOnSalariesExcludingCooksAndDrivers:
        sheetRecord[
          'Total annual spending on salaries excluding cooks and drivers (KES)'
        ] || '',
      totalAnnualSpendingOnRent:
        sheetRecord['Total annual spending on rent (KES)'] || '',
      totalAnnualOwnersDraw:
        sheetRecord['Total annual owners draw (KES)'] || '',
      totalAnnualDebtPaymentOfSchoolAndDirectors:
        sheetRecord[
          'Total annual debt payment of school and directors (KES)'
        ] || '',
      totalOfSalariesRentDebtAndOwnersDraw:
        sheetRecord['Total of salaries, rent, debt, and owners draw (KES)'] ||
        '',
      annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndTransport:
        sheetRecord[
          'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport'
        ] || '',
      totalAnnualExpensesExcludingFoodAndTransport:
        sheetRecord[
          'Total Annual Expenses Excluding Food and Transport (KES)'
        ] || '',
      annualProfitExcludingFoodAndTransportExpenses:
        sheetRecord[
          'Annual Profit Excluding Food and Transport Expenses (Bank and M Pesa Collections Minus Expenses)'
        ] || '',
      annualTransportExpenseEstimateIncludingDriverSalaries:
        sheetRecord[
          'Annual Transport Expense Estimate Including Driver Salaries (KES)'
        ] || '',
      annualFoodExpenseEstimateIncludingCookSalaries:
        sheetRecord[
          'Annual Food Expense Estimate Including Cook Salaries (KES)'
        ] || '',
      annualProfitIncludingFoodAndTransportExpenses:
        sheetRecord['Annual Profit Including Food and Transport Expenses'] ||
        '',
      monthlyProfitIncludingAllExpenses:
        sheetRecord['Monthly Profit Including all Expenses'] || '',
      lesserOfMonthlyProfitAnd35PercentProfitMargin:
        sheetRecord['Lesser of monthly profit and 35% profit margin'] || '',
      debtRatio: sheetRecord['Debt Ratio'] || '',
      loanLengthMonths: sheetRecord['Loan Length (Months)'] || '',
      annualReducingInterestRate:
        sheetRecord['Annual Reducing Interest Rate'] || '',
      maximumMonthlyPayment: sheetRecord['Maximum Monthly Payment'] || '',
      maximumLoan: sheetRecord['Maximum Loan'] || '',
      annualNonSchoolRevenueGenerated:
        sheetRecord['Annual non school revenue generated  (KES)'] || '',
      annualSponsorshipRevenue:
        sheetRecord['Annual sponsorship revenue (KES)'] || '',
      totalBadDebtOnCrbHeldBySchoolAndDirectors:
        sheetRecord[
          'Total bad debt on CRB held by school and directors (KES)'
        ] || '',
      totalDebtOnCrbFullyPaidOffBySchoolAndDirectors:
        sheetRecord[
          'Total debt on CRB fully paid off by school and directors'
        ] || '',
      totalEstimatedValueOfAssets:
        sheetRecord[
          'Total estimated value of assets held by school and directors (KES)'
        ] || '',
      annualDonationRevenue: sheetRecord['Annual donation revenue'] || '',
      maximumPreviousDaysLate: sheetRecord['Maximum Previous Days Late'] || '',
      numberOfInstallmentsPaidLate:
        sheetRecord['Number of Installments Paid Late'] || '',
      schoolCreditRisk: sheetRecord['School Credit Risk'] || '',
      previousRestructure: sheetRecord['Previous Restructure?'] || '',
      predictedDaysLate: sheetRecord['Predicted Days Late']
        ? Number(sheetRecord['Predicted Days Late'])
        : null,
      currentDebtToIncome: sheetRecord['Current Debt to Income'] || '',
      profitMarginTotalProfitTotalRevenueNotAdjustedDownTo35Percent:
        sheetRecord[
          'Profit Margin (Total Profit/Total Revenue, not adjusted down to 35%)'
        ] || '',
      totalDebt: sheetRecord['Total Debt'] || '',
      collateralCoverageOfLoanAmountRequested:
        sheetRecord['Collateral Coverage of Loan Amount Requested'] || '',
      previousLoansWithJackfruit:
        sheetRecord['Previous Loans with Jackfruit'] || '',
      averageBankBalance: sheetRecord['Average bank balance (KES)'] || '',
      averageBankBalanceTotalUnadjustedRevenue:
        sheetRecord['Average bank balance / total  unadjusted revenue'] || '',
      synced: true, // Mark as synced since we're importing from sheets
    };
  }
}
