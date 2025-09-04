import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvestmentCommitteeDbService {
  private readonly logger = new Logger(InvestmentCommitteeDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.investmentCommittee.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        'Error finding all investment committee records:',
        error,
      );
      throw error;
    }
  }

  async findByCreditApplicationId(creditApplicationId: string) {
    try {
      return await this.prisma.investmentCommittee.findMany({
        where: { creditApplicationId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding investment committee records for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  async findUnsynced() {
    try {
      return await this.prisma.investmentCommittee.findMany({
        where: { synced: false },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        'Error finding unsynced investment committee records:',
        error,
      );
      throw error;
    }
  }

  async findSynced() {
    try {
      return await this.prisma.investmentCommittee.findMany({
        where: { synced: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        'Error finding synced investment committee records:',
        error,
      );
      throw error;
    }
  }

  async findById(id: string) {
    try {
      return await this.prisma.investmentCommittee.findUnique({
        where: { id: parseInt(id) },
      });
    } catch (error) {
      this.logger.error(
        `Error finding investment committee record ${id}:`,
        error,
      );
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.investmentCommittee.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(
        `Error finding investment committee record by sheetId ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async create(data: any) {
    try {
      return await this.prisma.investmentCommittee.create({
        data,
      });
    } catch (error) {
      this.logger.error('Error creating investment committee record:', error);
      throw error;
    }
  }

  async update(sheetId: string, data: any) {
    try {
      return await this.prisma.investmentCommittee.update({
        where: { sheetId },
        data,
      });
    } catch (error) {
      this.logger.error(
        `Error updating investment committee record ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async updateById(id: number, data: any) {
    try {
      return await this.prisma.investmentCommittee.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error(
        `Error updating investment committee record ${id}:`,
        error,
      );
      throw error;
    }
  }

  async updateSyncStatus(id: number, synced: boolean) {
    try {
      return await this.prisma.investmentCommittee.update({
        where: { id },
        data: { synced },
      });
    } catch (error) {
      this.logger.error(
        `Error updating sync status for investment committee record ${id}:`,
        error,
      );
      throw error;
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.investmentCommittee.delete({
        where: { id: parseInt(id) },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting investment committee record ${id}:`,
        error,
      );
      throw error;
    }
  }

  // Mapping between database fields and Google Sheets columns
  private sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'SSL ID': 'sslId',
    'School ID': 'schoolId',
    'Type of School': 'typeOfSchool',
    'Age of school': 'ageOfSchool',
    'Incorporation Structure': 'incorporationStructure',
    'School is profitable?': 'schoolIsProfitable',
    'Solvency (Assets/Liabilities)': 'solvencyAssetsLiabilities',
    'Number of Students the Previous Year': 'numberOfStudentsPreviousYear',
    'Number of Students from Enrollment Verification':
      'numberOfStudentsFromEnrollmentVerification',
    'Growth in Population': 'growthInPopulation',
    'Audited financials provided?': 'auditedFinancialsProvided',
    'School has a bank account and checks from that bank account?':
      'schoolHasBankAccountAndChecks',
    'Asset value has increased from two years ago?':
      'assetValueHasIncreasedFromTwoYearsAgo',
    'Total annual revenue from fees from student breakdown, Unadjusted':
      'totalAnnualRevenueFromFeesFromStudentBreakdownUnadjusted',
    'Annual revenue from Banka and M Pesa Statements':
      'annualRevenueFromBankaAndMPesaStatements',
    'Lesser of annual revenue from Banka and M Pesa Statements and 75% collections of school fees':
      'lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol',
    'Collections Rate': 'collectionsRate',
    'Average School Fees Charged': 'averageSchoolFeesCharged',
    'School sits on owned, leased, or rented land':
      'schoolSitsOnOwnedLeasedOrRentedLand',
    'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)':
      'totalCashHeldInBankAndMPesaAccounts',
    'Total annual spending on salaries excluding cooks and drivers (KES)':
      'totalAnnualSpendingOnSalariesExcludingCooksAndDrivers',
    'Total annual spending on rent (KES)': 'totalAnnualSpendingOnRent',
    'Total annual owners draw (KES)': 'totalAnnualOwnersDraw',
    'Total annual debt payment of school and directors (KES)':
      'totalAnnualDebtPaymentOfSchoolAndDirectors',
    'Total of salaries, rent, debt, and owners draw (KES)':
      'totalOfSalariesRentDebtAndOwnersDraw',
    'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport':
      'annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT',
    'Total Annual Expenses Excluding Food and Transport (KES)':
      'totalAnnualExpensesExcludingFoodAndTransport',
    'Annual Profit Excluding Food and Transport Expenses (Bank and M Pesa Collections Minus Expenses)':
      'annualProfitExcludingFoodAndTransportExpenses',
    'Annual Transport Expense Estimate Including Driver Salaries (KES)':
      'annualTransportExpenseEstimateIncludingDriverSalaries',
    'Annual Food Expense Estimate Including Cook Salaries (KES)':
      'annualFoodExpenseEstimateIncludingCookSalaries',
    'Annual Profit Including Food and Transport Expenses':
      'annualProfitIncludingFoodAndTransportExpenses',
    'Monthly Profit Including all Expenses':
      'monthlyProfitIncludingAllExpenses',
    'Lesser of monthly profit and 35% profit margin':
      'lesserOfMonthlyProfitAnd35PercentProfitMargin',
    'Debt Ratio': 'debtRatio',
    'Loan Length (Months)': 'loanLengthMonths',
    'Annual Reducing Interest Rate': 'annualReducingInterestRate',
    'Maximum Monthly Payment': 'maximumMonthlyPayment',
    'Maximum Loan': 'maximumLoan',
    'Annual non school revenue generated  (KES)':
      'annualNonSchoolRevenueGenerated',
    'Annual sponsorship revenue (KES)': 'annualSponsorshipRevenue',
    'Total bad debt on CRB held by school and directors (KES)':
      'totalBadDebtOnCrbHeldBySchoolAndDirectors',
    'Total debt on CRB fully paid off by school and directors':
      'totalDebtOnCrbFullyPaidOffBySchoolAndDirectors',
    'Total estimated value of assets held by school and directors (KES)':
      'totalEstimatedValueOfAssets',
    'Annual donation revenue': 'annualDonationRevenue',
    'Maximum Previous Days Late': 'maximumPreviousDaysLate',
    'Number of Installments Paid Late': 'numberOfInstallmentsPaidLate',
    'School Credit Risk': 'schoolCreditRisk',
    'Previous Restructure?': 'previousRestructure',
    'Predicted Days Late': 'predictedDaysLate',
    'Current Debt to Income': 'currentDebtToIncome',
    'Profit Margin (Total Profit/Total Revenue, not adjusted down to 35%)':
      'profitMarginTotalProfitTotalRevenueNotAdjustedDownTo35Percent',
    'Total Debt': 'totalDebt',
    'Collateral Coverage of Loan Amount Requested':
      'collateralCoverageOfLoanAmountRequested',
    'Previous Loans with Jackfruit': 'previousLoansWithJackfruit',
    'Average bank balance (KES)': 'averageBankBalance',
    'Average bank balance / total  unadjusted revenue':
      'averageBankBalanceTotalUnadjustedRevenue',
  };

  private dbToSheetMapping = {
    sheetId: 'ID',
    creditApplicationId: 'Credit Application ID',
    sslId: 'SSL ID',
    schoolId: 'School ID',
    typeOfSchool: 'Type of School',
    ageOfSchool: 'Age of school',
    incorporationStructure: 'Incorporation Structure',
    schoolIsProfitable: 'School is profitable?',
    solvencyAssetsLiabilities: 'Solvency (Assets/Liabilities)',
    numberOfStudentsPreviousYear: 'Number of Students the Previous Year',
    numberOfStudentsFromEnrollmentVerification:
      'Number of Students from Enrollment Verification',
    growthInPopulation: 'Growth in Population',
    auditedFinancialsProvided: 'Audited financials provided?',
    schoolHasBankAccountAndChecks:
      'School has a bank account and checks from that bank account?',
    assetValueHasIncreasedFromTwoYearsAgo:
      'Asset value has increased from two years ago?',
    totalAnnualRevenueFromFeesFromStudentBreakdownUnadjusted:
      'Total annual revenue from fees from student breakdown, Unadjusted',
    annualRevenueFromBankaAndMPesaStatements:
      'Annual revenue from Banka and M Pesa Statements',
    lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol:
      'Lesser of annual revenue from Banka and M Pesa Statements and 75% collections of school fees',
    collectionsRate: 'Collections Rate',
    averageSchoolFeesCharged: 'Average School Fees Charged',
    schoolSitsOnOwnedLeasedOrRentedLand:
      'School sits on owned, leased, or rented land',
    totalCashHeldInBankAndMPesaAccounts:
      'Total cash held in bank and M Pesa accounts at time of credit scoring (KES)',
    totalAnnualSpendingOnSalariesExcludingCooksAndDrivers:
      'Total annual spending on salaries excluding cooks and drivers (KES)',
    totalAnnualSpendingOnRent: 'Total annual spending on rent (KES)',
    totalAnnualOwnersDraw: 'Total annual owners draw (KES)',
    totalAnnualDebtPaymentOfSchoolAndDirectors:
      'Total annual debt payment of school and directors (KES)',
    totalOfSalariesRentDebtAndOwnersDraw:
      'Total of salaries, rent, debt, and owners draw (KES)',
    annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT:
      'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport',
    totalAnnualExpensesExcludingFoodAndTransport:
      'Total Annual Expenses Excluding Food and Transport (KES)',
    annualProfitExcludingFoodAndTransportExpenses:
      'Annual Profit Excluding Food and Transport Expenses (Bank and M Pesa Collections Minus Expenses)',
    annualTransportExpenseEstimateIncludingDriverSalaries:
      'Annual Transport Expense Estimate Including Driver Salaries (KES)',
    annualFoodExpenseEstimateIncludingCookSalaries:
      'Annual Food Expense Estimate Including Cook Salaries (KES)',
    annualProfitIncludingFoodAndTransportExpenses:
      'Annual Profit Including Food and Transport Expenses',
    monthlyProfitIncludingAllExpenses: 'Monthly Profit Including all Expenses',
    lesserOfMonthlyProfitAnd35PercentProfitMargin:
      'Lesser of monthly profit and 35% profit margin',
    debtRatio: 'Debt Ratio',
    loanLengthMonths: 'Loan Length (Months)',
    annualReducingInterestRate: 'Annual Reducing Interest Rate',
    maximumMonthlyPayment: 'Maximum Monthly Payment',
    maximumLoan: 'Maximum Loan',
    annualNonSchoolRevenueGenerated:
      'Annual non school revenue generated  (KES)',
    annualSponsorshipRevenue: 'Annual sponsorship revenue (KES)',
    totalBadDebtOnCrbHeldBySchoolAndDirectors:
      'Total bad debt on CRB held by school and directors (KES)',
    totalDebtOnCrbFullyPaidOffBySchoolAndDirectors:
      'Total debt on CRB fully paid off by school and directors',
    totalEstimatedValueOfAssets:
      'Total estimated value of assets held by school and directors (KES)',
    annualDonationRevenue: 'Annual donation revenue',
    maximumPreviousDaysLate: 'Maximum Previous Days Late',
    numberOfInstallmentsPaidLate: 'Number of Installments Paid Late',
    schoolCreditRisk: 'School Credit Risk',
    previousRestructure: 'Previous Restructure?',
    predictedDaysLate: 'Predicted Days Late',
    currentDebtToIncome: 'Current Debt to Income',
    profitMarginTotalProfitTotalRevenueNotAdjustedDownTo35Percent:
      'Profit Margin (Total Profit/Total Revenue, not adjusted down to 35%)',
    totalDebt: 'Total Debt',
    collateralCoverageOfLoanAmountRequested:
      'Collateral Coverage of Loan Amount Requested',
    previousLoansWithJackfruit: 'Previous Loans with Jackfruit',
    averageBankBalance: 'Average bank balance (KES)',
    averageBankBalanceTotalUnadjustedRevenue:
      'Average bank balance / total  unadjusted revenue',
  };

  convertSheetDataToDb(sheetData: any) {
    const dbData: any = {};
    Object.keys(this.dbToSheetMapping).forEach((dbKey) => {
      const sheetKey = this.dbToSheetMapping[dbKey];
      if (sheetData[sheetKey] !== undefined) {
        // Convert data types based on field requirements
        let value = sheetData[sheetKey];

        // Handle numeric fields that should be integers (only predictedDaysLate is Int in schema)
        if (dbKey === 'predictedDaysLate') {
          if (value !== '' && value !== null && value !== undefined) {
            value = parseInt(value.toString(), 10);
            if (isNaN(value)) value = 0;
          } else {
            value = 0;
          }
        }
        // All other fields are String in the schema, so keep them as strings
        // The calculated values from Google Sheets will be converted to strings automatically

        dbData[dbKey] = value;
      }
    });
    return dbData;
  }

  convertDbDataToSheet(dbData: any) {
    const sheetData: any = {};
    Object.keys(this.dbToSheetMapping).forEach((dbKey) => {
      if (dbData[dbKey] !== undefined) {
        const sheetKey = this.dbToSheetMapping[dbKey];
        sheetData[sheetKey] = dbData[dbKey];
      }
    });
    return sheetData;
  }
}
