import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Logger,
  UseInterceptors,
  UploadedFiles,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { FinancialSurveysDbService } from '../services/financial-surveys-db.service';
import { FinancialSurveysSyncService } from '../services/financial-surveys-sync.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { CreateFinancialSurveyDto } from '../dto/create-financial-survey.dto';

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
    private readonly financialSurveysDbService: FinancialSurveysDbService,
    private readonly financialSurveysSyncService: FinancialSurveysSyncService,
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'leaseAgreement', maxCount: 1 }]),
  )
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      exceptionFactory: (errors) => {
        const errorMessages = errors.map((error) => {
          if (error.constraints) {
            return Object.values(error.constraints).join(', ');
          }
          return error.property;
        });
        return new Error(`Validation Error: ${errorMessages.join(', ')}`);
      },
    }),
  )
  async createFinancialSurvey(
    @Body() createDto: CreateFinancialSurveyDto,
    @UploadedFiles()
    files: {
      leaseAgreement?: Express.Multer.File[];
    },
  ) {
    try {
      // Generate unique ID for the survey
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 8);
      const sheetId = `FS-${timestamp}-${random}`;

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
      if (files && files.leaseAgreement && files.leaseAgreement[0]) {
        leaseAgreementUrl = await this.googleDriveService.uploadFile(
          files.leaseAgreement[0].buffer,
          files.leaseAgreement[0].originalname,
          files.leaseAgreement[0].mimetype,
        );
      }

      const surveyData = {
        ID: sheetId,
        sheetId: sheetId, // Add sheetId for database storage
        'Credit Application ID': createDto.creditApplicationId,
        'Survey Date': createDto.surveyDate,
        'Director ID': createDto.directorId,
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
        'How much does the school spend on food per term? ':
          createDto.termlyFoodExpense,
        'How much does the school spend on cooking fuel per term?':
          createDto.termlyFuelExpense,
        'How much does the school spend on students’ textbooks annually?':
          createDto.annualStudentTextbookExpense,
        'How much does the school spend on teachers’ textbooks annually?':
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
        'What was the value of the assets held by the school last year?':
          createDto.lastYearAssetValue,
        'Loan Amount Deposited into Bank Accounts in Last Year':
          createDto.lastYearLoanDeposits,
        'How many students did the school have the previous academic year ':
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
        'How many branches does the school have?':
          createDto.branchCount || createDto.numberOfBranches,
        'Has this school ever borrowed from a microfinance institution (e.g., Ed Partners or Kenya Women Microfinance Bank)?':
          createDto.hasMicrofinanceBorrowing ||
          createDto.hasMicrofinanceBorrowingHistory,
        'Has this school ever borrowed from a formal financial institution (Kenya Co-Op, KCB, Equity Bank, etc.)?':
          createDto.hasFormalBankBorrowing,
      };

      // Create record in database
      const createdRecord =
        await this.financialSurveysDbService.create(surveyData);

      // Trigger background sync - use the database ID
      this.triggerBackgroundSync(
        createdRecord.id,
        createDto.creditApplicationId,
        'create',
      );

      return {
        success: true,
        message: 'Financial survey created successfully',
        data: createdRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error creating financial survey: ${apiError.message}`);
      throw error;
    }
  }

  private async triggerBackgroundSync(
    recordId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ): Promise<void> {
    setTimeout(async () => {
      try {
        await this.financialSurveysSyncService.syncFinancialSurveyById(
          recordId,
          operation,
        );
        this.logger.log(`Background sync completed for survey ${recordId}`);
      } catch (error) {
        this.logger.error(
          `Background sync failed for survey ${recordId}:`,
          error,
        );
      }
    }, 2000); // 2 second delay
  }

  @Get('by-application/:creditApplicationId')
  async getSurveysByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching financial surveys for application ID: ${creditApplicationId}`,
      );

      const surveys =
        await this.financialSurveysDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      return {
        success: true,
        count: surveys.length,
        data: surveys,
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

      const surveys =
        await this.financialSurveysDbService.findByDirectorId(directorId);

      return {
        success: true,
        count: surveys.length,
        data: surveys,
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
      const survey = await this.financialSurveysDbService.findBySheetId(id);

      if (!survey) {
        return { success: false, message: 'Financial survey not found' };
      }

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
      const surveys = await this.financialSurveysDbService.findAll();

      return {
        success: true,
        count: surveys.length,
        data: surveys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all financial surveys: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'leaseAgreement', maxCount: 1 }]),
  )
  async updateFinancialSurvey(
    @Param('id') id: string,
    @Body()
    updateDto: {
      creditApplicationId?: string;
      surveyDate?: string;
      directorId?: string;

      // School Information
      schoolGrades?: string[];
      isSchoolAPBETOrPrivate?: 'APBET' | 'Private';

      // Church Support
      isChurchSupported?: 'TRUE' | 'FALSE';
      churchName?: string;
      churchAnnualSupport?: string;
      churchBenefits?: string;

      // Facilities
      facilityOwnership?: 'Rent' | 'Lease' | 'Own';
      annualLeaseRent?: string;
      ownerAnnualWithdrawal?: string;
      monthlyDebtPayments?: string;

      // Meals
      providesMeals?: 'Y' | 'N';
      termlyFoodExpense?: string;
      termlyFuelExpense?: string;

      // Academic Expenses
      annualStudentTextbookExpense?: string;
      annualTeacherTextbookExpense?: string;
      termlyStationeryExpense?: string;

      // Utility Expenses
      monthlyWifiExpense?: string;
      termlyAirtimeExpense?: string;
      monthlyWaterExpense?: string;
      termlyMiscExpense?: string;
      annualTaxLicenseExpense?: string;
      monthlyElectricityExpense?: string;

      // Transportation
      hasVehicles?: 'Y' | 'N';
      termlyVehicleServiceExpense?: string;
      termlyVehicleFuelExpense?: string;
      totalVehiclePurchaseExpense?: string;

      // Asset & Maintenance
      annualEquipmentFurnitureExpense?: string;
      annualRepairMaintenanceExpense?: string;

      // Additional Revenue
      hasOtherRevenue?: 'Y' | 'N';
      otherRevenueSources?: string;
      annualOtherRevenue?: string;

      // Sponsorships
      sponsoredChildrenCount?: string;
      annualSponsorshipRevenue?: string;

      // Asset Values
      lastYearAssetValue?: string;
      lastYearLoanDeposits?: string;
      previousYearStudentCount?: string;

      // Donations
      receivesSignificantDonations?: 'Y' | 'N';
      annualDonationRevenue?: string;

      // Future Planning
      majorProjectsAndMitigation?: string;
      nextYearExpectedStudents?: string;
      twoYearsAgoAssetValue?: string;

      // Banking & Financial History
      currentBankBalance?: string;
      yearsAtCurrentPremises?: string;
      yearsWithBankAccount?: string;
      hasAuditedFinancials?: 'Y' | 'N';
      branchCount?: string;

      // Borrowing History
      hasMicrofinanceBorrowing?: 'Y' | 'N';
      hasFormalBankBorrowing?: 'Y' | 'N';
    },
    @UploadedFiles()
    files: {
      leaseAgreement?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.debug(`Updating financial survey with ID: ${id}`, updateDto);

      // First verify the record exists
      const existingSurvey =
        await this.financialSurveysDbService.findBySheetId(id);
      if (!existingSurvey) {
        return {
          success: false,
          error: 'Financial survey not found',
        };
      }

      // Handle file upload if provided
      let leaseAgreementUrl = '';
      if (files && files.leaseAgreement && files.leaseAgreement[0]) {
        leaseAgreementUrl = await this.googleDriveService.uploadFile(
          files.leaseAgreement[0].buffer,
          files.leaseAgreement[0].originalname,
          files.leaseAgreement[0].mimetype,
        );
      }

      // Create updated data object
      const updateData: any = {};

      if (updateDto.creditApplicationId)
        updateData.creditApplicationId = updateDto.creditApplicationId;
      if (updateDto.surveyDate) updateData.surveyDate = updateDto.surveyDate;
      if (updateDto.directorId) updateData.directorId = updateDto.directorId;
      if (updateDto.schoolGrades)
        updateData.schoolGrades = Array.isArray(updateDto.schoolGrades)
          ? updateDto.schoolGrades.join(', ')
          : updateDto.schoolGrades;
      if (updateDto.isSchoolAPBETOrPrivate)
        updateData.isSchoolAPBETOrPrivate = updateDto.isSchoolAPBETOrPrivate;
      if (updateDto.isChurchSupported)
        updateData.isChurchSupported = updateDto.isChurchSupported;
      if (updateDto.churchName) updateData.churchName = updateDto.churchName;
      if (updateDto.churchAnnualSupport)
        updateData.churchAnnualSupport = updateDto.churchAnnualSupport;
      if (updateDto.churchBenefits)
        updateData.churchBenefits = updateDto.churchBenefits;
      if (updateDto.facilityOwnership)
        updateData.facilityOwnership = updateDto.facilityOwnership;
      if (updateDto.annualLeaseRent)
        updateData.annualLeaseRent = updateDto.annualLeaseRent;
      if (updateDto.ownerAnnualWithdrawal)
        updateData.ownerAnnualWithdrawal = updateDto.ownerAnnualWithdrawal;
      if (updateDto.monthlyDebtPayments)
        updateData.monthlyDebtPayments = updateDto.monthlyDebtPayments;
      if (updateDto.providesMeals)
        updateData.providesMeals = updateDto.providesMeals;
      if (updateDto.termlyFoodExpense)
        updateData.termlyFoodExpense = updateDto.termlyFoodExpense;
      if (updateDto.termlyFuelExpense)
        updateData.termlyFuelExpense = updateDto.termlyFuelExpense;
      if (updateDto.annualStudentTextbookExpense)
        updateData.annualStudentTextbookExpense =
          updateDto.annualStudentTextbookExpense;
      if (updateDto.annualTeacherTextbookExpense)
        updateData.annualTeacherTextbookExpense =
          updateDto.annualTeacherTextbookExpense;
      if (updateDto.termlyStationeryExpense)
        updateData.termlyStationeryExpense = updateDto.termlyStationeryExpense;
      if (updateDto.monthlyWifiExpense)
        updateData.monthlyWifiExpense = updateDto.monthlyWifiExpense;
      if (updateDto.termlyAirtimeExpense)
        updateData.termlyAirtimeExpense = updateDto.termlyAirtimeExpense;
      if (updateDto.monthlyWaterExpense)
        updateData.monthlyWaterExpense = updateDto.monthlyWaterExpense;
      if (updateDto.termlyMiscExpense)
        updateData.termlyMiscExpense = updateDto.termlyMiscExpense;
      if (updateDto.annualTaxLicenseExpense)
        updateData.annualTaxLicenseExpense = updateDto.annualTaxLicenseExpense;
      if (updateDto.monthlyElectricityExpense)
        updateData.monthlyElectricityExpense =
          updateDto.monthlyElectricityExpense;
      if (updateDto.hasVehicles) updateData.hasVehicles = updateDto.hasVehicles;
      if (updateDto.termlyVehicleServiceExpense)
        updateData.termlyVehicleServiceExpense =
          updateDto.termlyVehicleServiceExpense;
      if (updateDto.termlyVehicleFuelExpense)
        updateData.termlyVehicleFuelExpense =
          updateDto.termlyVehicleFuelExpense;
      if (updateDto.totalVehiclePurchaseExpense)
        updateData.totalVehiclePurchaseExpense =
          updateDto.totalVehiclePurchaseExpense;
      if (updateDto.annualEquipmentFurnitureExpense)
        updateData.annualEquipmentFurnitureExpense =
          updateDto.annualEquipmentFurnitureExpense;
      if (updateDto.annualRepairMaintenanceExpense)
        updateData.annualRepairMaintenanceExpense =
          updateDto.annualRepairMaintenanceExpense;
      if (updateDto.hasOtherRevenue)
        updateData.hasOtherRevenue = updateDto.hasOtherRevenue;
      if (updateDto.otherRevenueSources)
        updateData.otherRevenueSources = updateDto.otherRevenueSources;
      if (updateDto.annualOtherRevenue)
        updateData.annualOtherRevenue = updateDto.annualOtherRevenue;
      if (updateDto.sponsoredChildrenCount)
        updateData.sponsoredChildrenCount = updateDto.sponsoredChildrenCount;
      if (updateDto.annualSponsorshipRevenue)
        updateData.annualSponsorshipRevenue =
          updateDto.annualSponsorshipRevenue;
      if (updateDto.lastYearAssetValue)
        updateData.lastYearAssetValue = updateDto.lastYearAssetValue;
      if (updateDto.lastYearLoanDeposits)
        updateData.lastYearLoanDeposits = updateDto.lastYearLoanDeposits;
      if (updateDto.previousYearStudentCount)
        updateData.previousYearStudentCount =
          updateDto.previousYearStudentCount;
      if (leaseAgreementUrl) updateData.leaseAgreement = leaseAgreementUrl;
      if (updateDto.receivesSignificantDonations)
        updateData.receivesSignificantDonations =
          updateDto.receivesSignificantDonations;
      if (updateDto.annualDonationRevenue)
        updateData.annualDonationRevenue = updateDto.annualDonationRevenue;
      if (updateDto.majorProjectsAndMitigation)
        updateData.majorProjectsAndMitigation =
          updateDto.majorProjectsAndMitigation;
      if (updateDto.nextYearExpectedStudents)
        updateData.nextYearExpectedStudents =
          updateDto.nextYearExpectedStudents;
      if (updateDto.twoYearsAgoAssetValue)
        updateData.twoYearsAgoAssetValue = updateDto.twoYearsAgoAssetValue;
      if (updateDto.currentBankBalance)
        updateData.currentBankBalance = updateDto.currentBankBalance;
      if (updateDto.yearsAtCurrentPremises)
        updateData.yearsAtCurrentPremises = updateDto.yearsAtCurrentPremises;
      if (updateDto.yearsWithBankAccount)
        updateData.yearsWithBankAccount = updateDto.yearsWithBankAccount;
      if (updateDto.hasAuditedFinancials)
        updateData.hasAuditedFinancials = updateDto.hasAuditedFinancials;
      if (updateDto.branchCount) updateData.branchCount = updateDto.branchCount;
      if (updateDto.hasMicrofinanceBorrowing)
        updateData.hasMicrofinanceBorrowing =
          updateDto.hasMicrofinanceBorrowing;
      if (updateDto.hasFormalBankBorrowing)
        updateData.hasFormalBankBorrowing = updateDto.hasFormalBankBorrowing;

      // Update the record in database
      const updatedSurvey = await this.financialSurveysDbService.update(
        id,
        updateData,
      );

      // Trigger background sync
      this.triggerBackgroundSync(
        updatedSurvey.id,
        updateDto.creditApplicationId || existingSurvey.creditApplicationId,
        'update',
      );

      return {
        success: true,
        message: 'Financial survey updated successfully',
        data: updatedSurvey,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating financial survey: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
