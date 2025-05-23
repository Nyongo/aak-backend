import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Logger,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/financial-survey')
export class FinancialSurveyController {
  private readonly logger = new Logger(FinancialSurveyController.name);
  private readonly SHEET_NAME = 'Financial Survey';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'leaseAgreement', maxCount: 1 }]),
  )
  async createFinancialSurvey(
    @Body()
    createDto: {
      creditApplicationId: string;
      surveyDate: string;
      directorId: string;
      // createdBy: string;

      // School Information
      schoolGrades: string[];
      isSchoolAPBETOrPrivate: 'APBET' | 'Private';

      // Church Support
      isChurchSupported: 'TRUE' | 'FALSE';
      churchName: string;
      churchAnnualSupport: string;
      churchBenefits: string;

      // Facilities
      facilityOwnership: 'Rent' | 'Lease' | 'Own';
      annualLeaseRent: string;
      ownerAnnualWithdrawal: string;
      monthlyDebtPayments: string;

      // Meals
      providesMeals: 'Y' | 'N';
      termlyFoodExpense: string;
      termlyFuelExpense: string;

      // Academic Expenses
      annualStudentTextbookExpense: string;
      annualTeacherTextbookExpense: string;
      termlyStationeryExpense: string;

      // Utility Expenses
      monthlyWifiExpense: string;
      termlyAirtimeExpense: string;
      monthlyWaterExpense: string;
      termlyMiscExpense: string;
      annualTaxLicenseExpense: string;
      monthlyElectricityExpense: string;

      // Transportation
      hasVehicles: 'Y' | 'N';
      termlyVehicleServiceExpense: string;
      termlyVehicleFuelExpense: string;
      totalVehiclePurchaseExpense: string;

      // Asset & Maintenance
      annualEquipmentFurnitureExpense: string;
      annualRepairMaintenanceExpense: string;

      // Additional Revenue
      hasOtherRevenue: 'Y' | 'N';
      otherRevenueSources: string;
      annualOtherRevenue: string;

      // Sponsorships
      sponsoredChildrenCount: string;
      annualSponsorshipRevenue: string;

      // Financial Estimates
      annualExpenseEstimate: string;
      annualFoodExpenseEstimate: string;
      annualTransportExpenseEstimate: string;

      // Asset Values
      lastYearAssetValue: string;
      lastYearLoanDeposits: string;
      previousYearStudentCount: string;

      // Donations
      receivesSignificantDonations: 'Y' | 'N';
      annualDonationRevenue: string;

      // Future Planning
      majorProjectsAndMitigation: string;
      nextYearExpectedStudents: string;
      twoYearsAgoAssetValue: string;

      // Banking & Financial History
      currentBankBalance: string;
      yearsAtCurrentPremises: string;
      yearsWithBankAccount: string;
      hasAuditedFinancials: 'Y' | 'N';
      branchCount: string;

      // Borrowing History
      hasMicrofinanceBorrowing: 'Y' | 'N';
      hasFormalBankBorrowing: 'Y' | 'N';
    },
    @UploadedFiles()
    files: {
      leaseAgreement?: Express.Multer.File[];
    },
  ) {
    try {
      // Generate unique ID for the survey
      const id = `FS-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

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

      // Upload lease agreement if provided
      let leaseAgreementUrl = '';
      if (files.leaseAgreement && files.leaseAgreement[0]) {
        leaseAgreementUrl = await this.googleDriveService.uploadFile(
          files.leaseAgreement[0].buffer,
          files.leaseAgreement[0].originalname,
          files.leaseAgreement[0].mimetype,
        );
      }

      const rowData = {
        ID: id,
        'Credit Application ID': createDto.creditApplicationId,
        'Survey Date': createDto.surveyDate,
        'Director ID': createDto.directorId,
        // 'Created By': createDto.createdBy,
        'Created At': createdAt,
        'What grades does the school serve?': Array.isArray(
          createDto.schoolGrades,
        )
          ? createDto.schoolGrades.join(', ')
          : createDto.schoolGrades || '',
        'Is the school APBET or Private?': createDto.isSchoolAPBETOrPrivate,
        'Is the school supported by a major church?':
          createDto.isChurchSupported,
        'Which church?': createDto.churchName,
        'How much money does the church give the school per year?':
          createDto.churchAnnualSupport,
        'What other benefits does church provide to the school?':
          createDto.churchBenefits,
        'Does the school rent, lease, or own its facilities?':
          createDto.facilityOwnership,
        'How much does the school pay for the lease or rental per year?':
          createDto.annualLeaseRent,
        'How much money does the owner withdraw from the school annually? (including direct expenses, salary, profit, dividends, etc)':
          createDto.ownerAnnualWithdrawal,
        'How much does the school and directors pay per month in school related debt payments, including debt on and off the CRB?':
          createDto.monthlyDebtPayments,
        'Does the school provide any meals?': createDto.providesMeals,
        'How much does the school spend on food per term?':
          createDto.termlyFoodExpense,
        'How much does the school spend on cooking fuel per term?':
          createDto.termlyFuelExpense,
        "How much does the school spend on students' textbooks annually?":
          createDto.annualStudentTextbookExpense,
        "How much does the school spend on teachers' textbooks annually?":
          createDto.annualTeacherTextbookExpense,
        'How much does the school spend on stationery per term?':
          createDto.termlyStationeryExpense,
        'How much does the school spend on WiFi per month?':
          createDto.monthlyWifiExpense,
        'How much does the school spend on airtime per term?':
          createDto.termlyAirtimeExpense,
        'How much does the school spend on water per month?':
          createDto.monthlyWaterExpense,
        'How much does the school spend on miscellaneous costs per term?':
          createDto.termlyMiscExpense,
        'How much does the school spend on taxes and licensing annually?':
          createDto.annualTaxLicenseExpense,
        'How much does the school spend on electricity per month?':
          createDto.monthlyElectricityExpense,
        'Does the school have vehicles for transportation?':
          createDto.hasVehicles,
        'How much in total does the school spend on vehicle service per term?':
          createDto.termlyVehicleServiceExpense,
        'How much in total does the school spend on vehicle fuel per term?':
          createDto.termlyVehicleFuelExpense,
        'Including all of its vehicles, how much has the school spent purchasing vehicles?':
          createDto.totalVehiclePurchaseExpense,
        'How much does the school spend on laptops, desks, blackboards, water tanks, kitchen appliances, and furniture annually?':
          createDto.annualEquipmentFurnitureExpense,
        'How much does the school pay for school repair and maintenance per year?':
          createDto.annualRepairMaintenanceExpense,
        'Does the school have any sources of revenue other than school fees and sponsorships?':
          createDto.hasOtherRevenue,
        'What are the other sources of revenue?': createDto.otherRevenueSources,
        "How much does the school collect from these other sources of revenue annually according to the director's estimate?":
          createDto.annualOtherRevenue,
        'How many children at the school are sponsored?':
          createDto.sponsoredChildrenCount,
        'How much annual sponsorship revenue does the school collect?':
          createDto.annualSponsorshipRevenue,
        'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport':
          Number(createDto.annualEquipmentFurnitureExpense) +
          Number(createDto.annualRepairMaintenanceExpense) +
          Number(createDto.termlyStationeryExpense) * 3 +
          Number(createDto.monthlyWifiExpense) * 12 +
          Number(createDto.monthlyElectricityExpense) * 12 +
          Number(createDto.termlyAirtimeExpense) * 3 +
          Number(createDto.monthlyWaterExpense) * 12 +
          Number(createDto.termlyMiscExpense) * 3 +
          Number(createDto.annualTaxLicenseExpense) +
          Number(createDto.annualStudentTextbookExpense) +
          Number(createDto.annualTeacherTextbookExpense),

        'Annual Food Expense Estimate':
          Number(createDto.termlyFoodExpense) * 3 +
          Number(createDto.termlyFuelExpense) * 3,
        'Annual Transport Expense Estimate':
          Number(createDto.termlyVehicleServiceExpense) * 3 +
          Number(createDto.termlyVehicleFuelExpense) * 3,
        'What was the value of the assets held by the school last year?':
          createDto.lastYearAssetValue,
        'Loan Amount Deposited into Bank Accounts in Last Year':
          createDto.lastYearLoanDeposits,
        'How many students did the school have the previous academic year':
          createDto.previousYearStudentCount,
        'Lease agreement, if any': leaseAgreementUrl,
        'Does the school receive significant revenue from donations?':
          createDto.receivesSignificantDonations,
        'How much annual donation revenue does it receive?':
          createDto.annualDonationRevenue,
        'What major project do you have in the foreseeable future that could strain your finances and what plans do you have to mitigate any constraints?':
          createDto.majorProjectsAndMitigation,
        'How many students do you expect to have next year?':
          createDto.nextYearExpectedStudents,
        'What was the value of the assets held by the school two years ago?':
          createDto.twoYearsAgoAssetValue,
        'Current total bank account balance': createDto.currentBankBalance,
        'Number of years at current business premises':
          createDto.yearsAtCurrentPremises,
        'How many years has the school had a bank account?':
          createDto.yearsWithBankAccount,
        'School has audited financials or management accounts?':
          createDto.hasAuditedFinancials,
        'How many branches does the school have?': createDto.branchCount,
        'Has this school ever borrowed from a microfinance institution (e.g., Ed Partners or Kenya Women Microfinance Bank)?':
          createDto.hasMicrofinanceBorrowing,
        'Has this school ever borrowed from a formal financial institution (Kenya Co-Op, KCB, Equity Bank, etc.)?':
          createDto.hasFormalBankBorrowing,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Financial survey created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error creating financial survey: ${apiError.message}`);
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getSurveysByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching financial surveys for application ID: ${creditApplicationId}`,
      );

      const surveys = await this.sheetsService.getSheetData(this.SHEET_NAME);
      this.logger.debug(`Retrieved ${surveys?.length || 0} rows from sheet`);

      if (!surveys || surveys.length === 0) {
        this.logger.debug('No financial surveys found in sheet');
        return { success: true, count: 0, data: [] };
      }

      const headers = surveys[0];
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

      const filteredData = surveys
        .slice(1)
        .filter((row) => {
          const matches = row[applicationIdIndex] === creditApplicationId;
          this.logger.debug(
            `Row ${row[0]} application ID: ${row[applicationIdIndex]}, matches: ${matches}`,
          );
          return matches;
        })
        .map((row) => {
          const survey = {};
          headers.forEach((header, index) => {
            survey[header] = row[index];
          });
          return survey;
        });

      this.logger.debug(`Found ${filteredData.length} matching surveys`);

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching financial surveys for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-director/:directorId')
  async getSurveysByDirector(@Param('directorId') directorId: string) {
    try {
      this.logger.debug(
        `Fetching financial surveys for director: ${directorId}`,
      );

      const surveys = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!surveys || surveys.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = surveys[0];
      const directorIdIndex = headers.indexOf('Director ID');

      if (directorIdIndex === -1) {
        return {
          success: false,
          message: 'Director ID column not found',
          data: [],
        };
      }

      const filteredData = surveys
        .slice(1)
        .filter((row) => row[directorIdIndex] === directorId)
        .map((row) => {
          const survey = {};
          headers.forEach((header, index) => {
            survey[header] = row[index];
          });
          return survey;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching financial surveys for director ${directorId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getSurveyById(@Param('id') id: string) {
    try {
      const surveys = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!surveys || surveys.length === 0) {
        return { success: false, message: 'No financial surveys found' };
      }

      const headers = surveys[0];
      const idIndex = headers.indexOf('ID');
      const surveyRow = surveys.find((row) => row[idIndex] === id);

      if (!surveyRow) {
        return { success: false, message: 'Financial survey not found' };
      }

      const survey = {};
      headers.forEach((header, index) => {
        survey[header] = surveyRow[index];
      });

      return { success: true, data: survey };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching financial survey ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllSurveys() {
    try {
      const surveys = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!surveys || surveys.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = surveys[0];
      const data = surveys.slice(1).map((row) => {
        const survey = {};
        headers.forEach((header, index) => {
          survey[header] = row[index];
        });
        return survey;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all financial surveys: ${apiError.message}`,
      );
      throw error;
    }
  }
}
