import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinancialSurveysDbService {
  private readonly logger = new Logger(FinancialSurveysDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Mapping from Google Sheets column names to database field names
  private sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'Survey Date': 'surveyDate',
    'Director ID': 'directorId',
    'Created By': 'createdBy',
    // Remove 'Created At': 'createdAt', to let Prisma handle it automatically
    'What grades does the school serve?': 'schoolGrades',
    'Is the school APBET or Private?': 'isSchoolAPBETOrPrivate',
    'Is the school supported by a major church?': 'isChurchSupported',
    'Which church?': 'churchName',
    'How much money does the church give the school per year?':
      'churchAnnualSupport',
    'What other benefits does church provide to the school?': 'churchBenefits',
    'Does the school rent, lease, or own its facilities?': 'facilityOwnership',
    'How much does the school pay for the lease or rental per year?':
      'annualLeaseRent',
    'How much money does the owner withdraw from the school annually? (including direct expenses, salary, profit, dividends, etc)':
      'ownerAnnualWithdrawal',
    'How much does the school and directors pay per month in school related debt payments, including debt on and off the CRB?':
      'monthlyDebtPayments',
    'Does the school provide any meals?': 'providesMeals',
    'How much does the school spend on food per term? ': 'termlyFoodExpense',
    'How much does the school spend on cooking fuel per term?':
      'termlyFuelExpense',
    'How much does the school spend on students’ textbooks annually?':
      'annualStudentTextbookExpense',
    'How much does the school spend on teachers’ textbooks annually?':
      'annualTeacherTextbookExpense',
    'How much does the school spend on stationery per term?':
      'termlyStationeryExpense',
    'How much does the school spend on WiFi per month?': 'monthlyWifiExpense',
    'How much does the school spend on airtime per term?':
      'termlyAirtimeExpense',
    'How much does the school spend on water per month?': 'monthlyWaterExpense',
    'How much does the school spend on miscellaneous costs per term?':
      'termlyMiscExpense',
    'How much does the school spend on taxes and licensing annually?':
      'annualTaxLicenseExpense',
    'How much does the school spend on electricity per month?':
      'monthlyElectricityExpense',
    'Does the school have vehicles for transportation?': 'hasVehicles',
    'How much in total does the school spend on vehicle service per term?':
      'termlyVehicleServiceExpense',
    'How much in total does the school spend on vehicle fuel per term?':
      'termlyVehicleFuelExpense',
    'Including all of its vehicles, how much has the school spent purchasing vehicles?':
      'totalVehiclePurchaseExpense',
    'How much does the school spend on laptops, desks, blackboards, water tanks, kitchen appliances, and furniture annually?':
      'annualEquipmentFurnitureExpense',
    'How much does the school pay for school repair and maintenance per year?':
      'annualRepairMaintenanceExpense',
    'Does the school have any sources of revenue other than school fees and sponsorships?':
      'hasOtherRevenue',
    'What are the other sources of revenue?': 'otherRevenueSources',
    "How much does the school collect from these other sources of revenue annually according to the director's estimate?":
      'annualOtherRevenue',
    'How many children at the school are sponsored?': 'sponsoredChildrenCount',
    'How much annual sponsorship revenue does the school collect?':
      'annualSponsorshipRevenue',
    'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport':
      'annualExpenseEstimate',
    'Annual Food Expense Estimate': 'annualFoodExpenseEstimate',
    'Annual Transport Expense Estimate': 'annualTransportExpenseEstimate',
    'What was the value of the assets held by the school last year?':
      'lastYearAssetValue',
    'Loan Amount Deposited into Bank Accounts in Last Year':
      'lastYearLoanDeposits',
    'How many students did the school have the previous academic year ':
      'previousYearStudentCount',
    'Lease agreement, if any': 'leaseAgreement',
    'Does the school receive significant revenue from donations? ':
      'receivesSignificantDonations',
    'How much annual donation revenue does it receive? ':
      'annualDonationRevenue',
    'What major project do you have in the foreseeable future that could strain your finances and what plans do you have to mitigate any constraints?':
      'majorProjectsAndMitigation',
    'How many students do you expect to have next year?':
      'nextYearExpectedStudents',
    'What was the value of the assets held by the school two years ago?':
      'twoYearsAgoAssetValue',
    'Current total bank account balance': 'currentBankBalance',
    'Number of years at current business premises': 'yearsAtCurrentPremises',
    'How many years has the school had a bank account?': 'yearsWithBankAccount',
    'School has audited financials or management accounts?':
      'hasAuditedFinancials',
    'How many branches does the school have?': 'branchCount',
    'Has this school ever borrowed from a microfinance institution (e.g., Ed Partners or Kenya Women Microfinance Bank)? ':
      'hasMicrofinanceBorrowing',
    'Has this school ever borrowed from a formal financial institution (Kenya Co-Op, KCB, Equity Bank, etc.)?':
      'hasFormalBankBorrowing',
  };

  // Mapping from database field names to Google Sheets column names
  private dbToSheetMapping = {
    sheetId: 'ID',
    creditApplicationId: 'Credit Application ID',
    surveyDate: 'Survey Date',
    directorId: 'Director ID',
    createdBy: 'Created By',
    createdAt: 'Created At',
    schoolGrades: 'What grades does the school serve?',
    isSchoolAPBETOrPrivate: 'Is the school APBET or Private?',
    isChurchSupported: 'Is the school supported by a major church?',
    churchName: 'Which church?',
    churchAnnualSupport:
      'How much money does the church give the school per year?',
    churchBenefits: 'What other benefits does church provide to the school?',
    facilityOwnership: 'Does the school rent, lease, or own its facilities?',
    annualLeaseRent:
      'How much does the school pay for the lease or rental per year?',
    ownerAnnualWithdrawal:
      'How much money does the owner withdraw from the school annually? (including direct expenses, salary, profit, dividends, etc)',
    monthlyDebtPayments:
      'How much does the school and directors pay per month in school related debt payments, including debt on and off the CRB?',
    providesMeals: 'Does the school provide any meals?',
    termlyFoodExpense: 'How much does the school spend on food per term? ',
    termlyFuelExpense:
      'How much does the school spend on cooking fuel per term?',
    annualStudentTextbookExpense:
      "How much does the school spend on students' textbooks annually?",
    annualTeacherTextbookExpense:
      "How much does the school spend on teachers' textbooks annually?",
    termlyStationeryExpense:
      'How much does the school spend on stationery per term?',
    monthlyWifiExpense: 'How much does the school spend on WiFi per month?',
    termlyAirtimeExpense: 'How much does the school spend on airtime per term?',
    monthlyWaterExpense: 'How much does the school spend on water per month?',
    termlyMiscExpense:
      'How much does the school spend on miscellaneous costs per term?',
    annualTaxLicenseExpense:
      'How much does the school spend on taxes and licensing annually?',
    monthlyElectricityExpense:
      'How much does the school spend on electricity per month?',
    hasVehicles: 'Does the school have vehicles for transportation?',
    termlyVehicleServiceExpense:
      'How much in total does the school spend on vehicle service per term?',
    termlyVehicleFuelExpense:
      'How much in total does the school spend on vehicle fuel per term?',
    totalVehiclePurchaseExpense:
      'Including all of its vehicles, how much has the school spent purchasing vehicles?',
    annualEquipmentFurnitureExpense:
      'How much does the school spend on laptops, desks, blackboards, water tanks, kitchen appliances, and furniture annually?',
    annualRepairMaintenanceExpense:
      'How much does the school pay for school repair and maintenance per year?',
    hasOtherRevenue:
      'Does the school have any sources of revenue other than school fees and sponsorships?',
    otherRevenueSources: 'What are the other sources of revenue?',
    annualOtherRevenue:
      "How much does the school collect from these other sources of revenue annually according to the director's estimate?",
    sponsoredChildrenCount: 'How many children at the school are sponsored?',
    annualSponsorshipRevenue:
      'How much annual sponsorship revenue does the school collect?',
    annualExpenseEstimate:
      'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport',
    annualFoodExpenseEstimate: 'Annual Food Expense Estimate',
    annualTransportExpenseEstimate: 'Annual Transport Expense Estimate',
    lastYearAssetValue:
      'What was the value of the assets held by the school last year?',
    lastYearLoanDeposits:
      'Loan Amount Deposited into Bank Accounts in Last Year',
    previousYearStudentCount:
      'How many students did the school have the previous academic year ',
    leaseAgreement: 'Lease agreement, if any',
    receivesSignificantDonations:
      'Does the school receive significant revenue from donations? ',
    annualDonationRevenue: 'How much annual donation revenue does it receive? ',
    majorProjectsAndMitigation:
      'What major project do you have in the foreseeable future that could strain your finances and what plans do you have to mitigate any constraints?',
    nextYearExpectedStudents:
      'How many students do you expect to have next year?',
    twoYearsAgoAssetValue:
      'What was the value of the assets held by the school two years ago?',
    currentBankBalance: 'Current total bank account balance',
    yearsAtCurrentPremises: 'Number of years at current business premises',
    yearsWithBankAccount: 'How many years has the school had a bank account?',
    hasAuditedFinancials:
      'School has audited financials or management accounts?',
    branchCount: 'How many branches does the school have?',
    hasMicrofinanceBorrowing:
      'Has this school ever borrowed from a microfinance institution (e.g., Ed Partners or Kenya Women Microfinance Bank)? ',
    hasFormalBankBorrowing:
      'Has this school ever borrowed from a formal financial institution (Kenya Co-Op, KCB, Equity Bank, etc.)?',
    synced: 'Synced',
  };

  private convertSheetDataToDb(sheetData: any): any {
    this.logger.debug('Converting sheet data to DB format:', sheetData);
    const dbData: any = {};
    for (const [sheetKey, dbKey] of Object.entries(this.sheetToDbMapping)) {
      if (sheetData[sheetKey] !== undefined) {
        dbData[dbKey] = sheetData[sheetKey];
      }
    }
    // Handle sheetId field if it exists in the input data
    if (sheetData.sheetId !== undefined) {
      dbData.sheetId = sheetData.sheetId;
      this.logger.debug('Added sheetId to dbData:', sheetData.sheetId);
    }
    this.logger.debug('Final dbData:', dbData);
    return dbData;
  }

  private convertDbDataToSheet(dbData: any): any {
    const sheetData: any = {};
    for (const [dbKey, sheetKey] of Object.entries(this.dbToSheetMapping)) {
      if (dbData[dbKey] !== undefined) {
        sheetData[sheetKey] = dbData[dbKey];
      }
    }
    return sheetData;
  }

  async findAll(): Promise<any[]> {
    try {
      const surveys = await this.prisma.financialSurvey.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return surveys.map((survey) => this.convertDbDataToSheet(survey));
    } catch (error) {
      this.logger.error('Error fetching all financial surveys:', error);
      throw error;
    }
  }

  async findByCreditApplicationId(creditApplicationId: string): Promise<any[]> {
    try {
      const surveys = await this.prisma.financialSurvey.findMany({
        where: { creditApplicationId },
        orderBy: { createdAt: 'desc' },
      });
      return surveys.map((survey) => this.convertDbDataToSheet(survey));
    } catch (error) {
      this.logger.error(
        `Error fetching surveys for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  async findByDirectorId(directorId: string): Promise<any[]> {
    try {
      const surveys = await this.prisma.financialSurvey.findMany({
        where: { directorId },
        orderBy: { createdAt: 'desc' },
      });
      return surveys.map((survey) => this.convertDbDataToSheet(survey));
    } catch (error) {
      this.logger.error(
        `Error fetching surveys for director ${directorId}:`,
        error,
      );
      throw error;
    }
  }

  async findUnsynced(): Promise<any[]> {
    try {
      const surveys = await this.prisma.financialSurvey.findMany({
        where: { synced: false },
      });
      return surveys.map((survey) => this.convertDbDataToSheet(survey));
    } catch (error) {
      this.logger.error('Error fetching unsynced surveys:', error);
      throw error;
    }
  }

  async findSynced(): Promise<any[]> {
    try {
      const surveys = await this.prisma.financialSurvey.findMany({
        where: { synced: true },
      });
      return surveys.map((survey) => this.convertDbDataToSheet(survey));
    } catch (error) {
      this.logger.error('Error fetching synced surveys:', error);
      throw error;
    }
  }

  async findById(id: number): Promise<any> {
    try {
      const survey = await this.prisma.financialSurvey.findUnique({
        where: { id },
      });
      // Return the raw database record for sync service to use
      return survey;
    } catch (error) {
      this.logger.error(`Error fetching survey ${id}:`, error);
      throw error;
    }
  }

  async findBySheetId(sheetId: string): Promise<any> {
    try {
      const survey = await this.prisma.financialSurvey.findUnique({
        where: { sheetId },
      });
      return survey ? this.convertDbDataToSheet(survey) : null;
    } catch (error) {
      this.logger.error(`Error fetching survey by sheetId ${sheetId}:`, error);
      throw error;
    }
  }

  async findRawBySheetId(sheetId: string): Promise<any> {
    try {
      const survey = await this.prisma.financialSurvey.findUnique({
        where: { sheetId },
      });
      // Return the raw database record for sync service to use
      return survey;
    } catch (error) {
      this.logger.error(
        `Error fetching raw survey by sheetId ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async create(data: any): Promise<any> {
    try {
      this.logger.debug('Creating survey with data:', data);
      const dbData = this.convertSheetDataToDb(data);
      this.logger.debug('Converted to database format:', dbData);
      const survey = await this.prisma.financialSurvey.create({
        data: dbData,
      });
      this.logger.debug('Created survey in database:', survey);
      // Return the raw database record so we can access the id field
      return survey;
    } catch (error) {
      this.logger.error('Error creating financial survey:', error);
      throw error;
    }
  }

  async update(sheetId: string, data: any): Promise<any> {
    try {
      const dbData = this.convertSheetDataToDb(data);
      const survey = await this.prisma.financialSurvey.update({
        where: { sheetId },
        data: dbData,
      });
      return this.convertDbDataToSheet(survey);
    } catch (error) {
      this.logger.error(`Error updating survey ${sheetId}:`, error);
      throw error;
    }
  }

  async updateById(id: number, data: any): Promise<any> {
    try {
      const survey = await this.prisma.financialSurvey.update({
        where: { id },
        data,
      });
      return this.convertDbDataToSheet(survey);
    } catch (error) {
      this.logger.error(`Error updating survey by ID ${id}:`, error);
      throw error;
    }
  }

  async updateSyncStatus(id: number, synced: boolean): Promise<void> {
    try {
      await this.prisma.financialSurvey.update({
        where: { id },
        data: { synced },
      });
    } catch (error) {
      this.logger.error(`Error updating sync status for survey ${id}:`, error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.financialSurvey.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting survey ${id}:`, error);
      throw error;
    }
  }
}
