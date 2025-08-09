import { Injectable, Logger } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { FinancialSurveysDbService } from './financial-surveys-db.service';

@Injectable()
export class FinancialSurveysSyncService {
  private readonly logger = new Logger(FinancialSurveysSyncService.name);

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly financialSurveysDbService: FinancialSurveysDbService,
  ) {}

  async syncAllToSheets(): Promise<void> {
    try {
      const unsyncedSurveys =
        await this.financialSurveysDbService.findUnsynced();
      this.logger.debug(`Found ${unsyncedSurveys.length} unsynced surveys`);

      for (const survey of unsyncedSurveys) {
        await this.syncFinancialSurveyToSheet(survey, 'create');
      }
    } catch (error) {
      this.logger.error('Error syncing all surveys to sheets:', error);
      throw error;
    }
  }

  async syncFinancialSurveyToSheet(
    surveyData: any,
    operation: 'create' | 'update' = 'create',
  ): Promise<void> {
    try {
      // Handle both database record format and sheet format
      // For database records, use sheetId as the identifier
      const identifier = surveyData.ID || surveyData.sheetId || surveyData.id;

      this.logger.debug('Sync service received surveyData:', surveyData);
      this.logger.debug('Identifier extracted:', identifier);

      // Convert database record to sheet format if needed
      const sheetData = surveyData.ID
        ? surveyData
        : {
            ID: surveyData.sheetId, // Use sheetId as ID for Google Sheets
            'Credit Application ID': surveyData.creditApplicationId,
            'Survey Date': surveyData.surveyDate,
            'Director ID': surveyData.directorId,
            'Created By': surveyData.createdBy,
            'What grades does the school serve?': surveyData.schoolGrades,
            'Is the school APBET or Private?':
              surveyData.isSchoolAPBETOrPrivate,
            'Is the school supported by a major church?':
              surveyData.isChurchSupported,
            'Which church?': surveyData.churchName,
            'How much money does the church give the school per year?':
              surveyData.churchAnnualSupport,
            'What other benefits does church provide to the school?':
              surveyData.churchBenefits,
            'Does the school rent, lease, or own its facilities?':
              surveyData.facilityOwnership,
            'How much does the school pay for the lease or rental per year?':
              surveyData.annualLeaseRent,
            'How much money does the owner withdraw from the school annually? (including direct expenses, salary, profit, dividends, etc)':
              surveyData.ownerAnnualWithdrawal,
            'How much does the school and directors pay per month in school related debt payments, including debt on and off the CRB?':
              surveyData.monthlyDebtPayments,
            'Does the school provide any meals?': surveyData.providesMeals,
            'How much does the school spend on food per term? ':
              surveyData.termlyFoodExpense,
            'How much does the school spend on cooking fuel per term?':
              surveyData.termlyFuelExpense,
            'How much does the school spend on students’ textbooks annually?':
              surveyData.annualStudentTextbookExpense,
            'How much does the school spend on teachers’ textbooks annually?':
              surveyData.annualTeacherTextbookExpense,
            'How much does the school spend on stationery per term?':
              surveyData.termlyStationeryExpense,
            'How much does the school spend on WiFi per month?':
              surveyData.monthlyWifiExpense,
            'How much does the school spend on airtime per term?':
              surveyData.termlyAirtimeExpense,
            'How much does the school spend on water per month?':
              surveyData.monthlyWaterExpense,
            'How much does the school spend on miscellaneous costs per term?':
              surveyData.termlyMiscExpense,
            'How much does the school spend on taxes and licensing annually?':
              surveyData.annualTaxLicenseExpense,
            'How much does the school spend on electricity per month?':
              surveyData.monthlyElectricityExpense,
            'Does the school have vehicles for transportation?':
              surveyData.hasVehicles,
            'How much in total does the school spend on vehicle service per term?':
              surveyData.termlyVehicleServiceExpense,
            'How much in total does the school spend on vehicle fuel per term?':
              surveyData.termlyVehicleFuelExpense,
            'Including all of its vehicles, how much has the school spent purchasing vehicles?':
              surveyData.totalVehiclePurchaseExpense,
            'How much does the school spend on laptops, desks, blackboards, water tanks, kitchen appliances, and furniture annually?':
              surveyData.annualEquipmentFurnitureExpense,
            'How much does the school pay for school repair and maintenance per year?':
              surveyData.annualRepairMaintenanceExpense,
            'Does the school have any sources of revenue other than school fees and sponsorships?':
              surveyData.hasOtherRevenue,
            'What are the other sources of revenue?':
              surveyData.otherRevenueSources,
            "How much does the school collect from these other sources of revenue annually according to the director's estimate?":
              surveyData.annualOtherRevenue,
            'How many children at the school are sponsored?':
              surveyData.sponsoredChildrenCount,
            'How much annual sponsorship revenue does the school collect?':
              surveyData.annualSponsorshipRevenue,
            'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport':
              surveyData.annualExpenseEstimate,
            'Annual Food Expense Estimate':
              surveyData.annualFoodExpenseEstimate,
            'Annual Transport Expense Estimate':
              surveyData.annualTransportExpenseEstimate,
            'What was the value of the assets held by the school last year?':
              surveyData.lastYearAssetValue,
            'Loan Amount Deposited into Bank Accounts in Last Year':
              surveyData.lastYearLoanDeposits,
            'How many students did the school have the previous academic year ':
              surveyData.previousYearStudentCount,
            'Lease agreement, if any': surveyData.leaseAgreement,
            'Does the school receive significant revenue from donations? ':
              surveyData.receivesSignificantDonations,
            'How much annual donation revenue does it receive? ':
              surveyData.annualDonationRevenue,
            'What major project do you have in the foreseeable future that could strain your finances and what plans do you have to mitigate any constraints?':
              surveyData.majorProjectsAndMitigation,
            'How many students do you expect to have next year?':
              surveyData.nextYearExpectedStudents,
            'What was the value of the assets held by the school two years ago?':
              surveyData.twoYearsAgoAssetValue,
            'Current total bank account balance': surveyData.currentBankBalance,
            'Number of years at current business premises':
              surveyData.yearsAtCurrentPremises,
            'How many years has the school had a bank account?':
              surveyData.yearsWithBankAccount,
            'School has audited financials or management accounts?':
              surveyData.hasAuditedFinancials,
            'How many branches does the school have?': surveyData.branchCount,
            'Has this school ever borrowed from a microfinance institution (e.g., Ed Partners or Kenya Women Microfinance Bank)? ':
              surveyData.hasMicrofinanceBorrowing,
            'Has this school ever borrowed from a formal financial institution (Kenya Co-Op, KCB, Equity Bank, etc.)?':
              surveyData.hasFormalBankBorrowing,
            'Created At': surveyData.createdAt,
            Synced: surveyData.synced,
          };

      this.logger.debug('Sheet data prepared:', sheetData);
      this.logger.debug('Sheet data keys:', Object.keys(sheetData));
      this.logger.debug(
        'Student textbooks expense:',
        sheetData[
          'How much does the school spend on students’ textbooks annually?'
        ],
      );
      this.logger.debug(
        'Teachers textbooks expense:',
        sheetData[
          'How much does the school spend on teachers’ textbooks annually?'
        ],
      );
      this.logger.debug(
        'Airtime expense:',
        sheetData['How much does the school spend on airtime per term?'],
      );
      this.logger.debug(
        'Checking if student textbooks key exists:',
        'How much does the school spend on students’ textbooks annually?' in
          sheetData,
      );
      this.logger.debug(
        'Checking if teachers textbooks key exists:',
        "How much does the school spend on teachers' textbooks annually?" in
          sheetData,
      );

      const { ID, ...dataWithoutId } = sheetData;

      this.logger.debug(
        `Syncing survey ${identifier} to sheets with operation: ${operation}`,
      );

      if (operation === 'update') {
        // For updates, find existing record and update it
        const existingRecord =
          await this.findExistingFinancialSurveyInSheets(identifier);
        if (existingRecord) {
          await this.sheetsService.updateFinancialSurvey(
            identifier,
            dataWithoutId,
          );
          this.logger.debug(`Updated survey ${identifier} in sheets`);
        } else {
          this.logger.warn(
            `Survey ${identifier} not found in sheets for update, creating new record`,
          );
          await this.sheetsService.addFinancialSurvey(sheetData);
          this.logger.debug(`Created survey ${identifier} in sheets`);

          // Sync calculated values back to database after a short delay
          setTimeout(async () => {
            try {
              await this.syncCalculatedValuesBackToDb(identifier);
              this.logger.debug(
                `Synced calculated values back to DB for ${identifier}`,
              );
            } catch (error) {
              this.logger.error(
                `Error syncing calculated values back for ${identifier}:`,
                error,
              );
            }
          }, 3000); // 3 second delay to allow Google Sheets to calculate
        }
      } else {
        // For creates, always add new record
        await this.sheetsService.addFinancialSurvey(sheetData);
        this.logger.debug(`Created survey ${identifier} in sheets`);

        // Sync calculated values back to database after a short delay
        setTimeout(async () => {
          try {
            await this.syncCalculatedValuesBackToDb(identifier);
            this.logger.debug(
              `Synced calculated values back to DB for ${identifier}`,
            );
          } catch (error) {
            this.logger.error(
              `Error syncing calculated values back for ${identifier}:`,
              error,
            );
          }
        }, 3000); // 3 second delay to allow Google Sheets to calculate
      }

      // Mark as synced in database using the database ID
      if (surveyData.id) {
        await this.financialSurveysDbService.updateSyncStatus(
          surveyData.id,
          true,
        );
        this.logger.debug(`Marked survey ${surveyData.id} as synced`);
      }
    } catch (error) {
      this.logger.error(`Error syncing survey to sheets:`, error);
      throw error;
    }
  }

  async syncFinancialSurveyById(
    id: number,
    operation: 'create' | 'update' = 'create',
  ): Promise<void> {
    try {
      const survey = await this.financialSurveysDbService.findById(id);
      if (!survey) {
        throw new Error(`Survey with ID ${id} not found`);
      }

      this.logger.debug('Database record fetched for sync:', survey);

      await this.syncFinancialSurveyToSheet(survey, operation);
    } catch (error) {
      this.logger.error(`Error syncing survey ${id}:`, error);
      throw error;
    }
  }

  async syncByCreditApplicationId(creditApplicationId: string): Promise<void> {
    try {
      const surveys =
        await this.financialSurveysDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      for (const survey of surveys) {
        await this.syncFinancialSurveyToSheet(survey, 'create');
      }
    } catch (error) {
      this.logger.error(
        `Error syncing surveys for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  async syncCalculatedValuesBackToDb(sheetId: string): Promise<void> {
    try {
      this.logger.debug(
        `Syncing calculated values back to DB for sheet ID: ${sheetId}`,
      );

      // Get the raw record from database to find the row and get the id
      const survey =
        await this.financialSurveysDbService.findRawBySheetId(sheetId);
      if (!survey) {
        this.logger.warn(
          `Survey with sheet ID ${sheetId} not found in database`,
        );
        return;
      }

      // Get all data from Google Sheets to find the row with calculated values
      const sheetsData = await this.sheetsService.getFinancialSurveys();
      if (!sheetsData || sheetsData.length === 0) {
        this.logger.warn('No data found in Financial Survey sheet');
        return;
      }

      const headers = sheetsData[0];
      const dataRows = sheetsData.slice(1); // Exclude headers

      // Find the row with our sheetId
      const idColumnIndex = headers.indexOf('ID');
      if (idColumnIndex === -1) {
        this.logger.warn('ID column not found in Financial Survey sheet');
        return;
      }

      const targetRow = dataRows.find(
        (row) => String(row[idColumnIndex] || '') === String(sheetId),
      );
      if (!targetRow) {
        this.logger.warn(
          `Row with sheet ID ${sheetId} not found in Google Sheets`,
        );
        return;
      }

      this.logger.debug(`Found row in sheets for sheet ID ${sheetId}`);

      // Map the calculated values back to database format
      const calculatedValues: any = {};

      // Map specific calculated fields that we want to sync back
      const calculatedFieldMappings = {
        'How much does the school and directors pay per month in school related debt payments, including debt on and off the CRB?':
          'monthlyDebtPayments',
        'Annual Expense Estimate Excluding Payroll, Rent, Debt, Owners Draw, Food, and Transport':
          'annualExpenseEstimate',
        'Annual Food Expense Estimate': 'annualFoodExpenseEstimate',
        'Annual Transport Expense Estimate': 'annualTransportExpenseEstimate',
      };

      for (const [sheetColumn, dbField] of Object.entries(
        calculatedFieldMappings,
      )) {
        const columnIndex = headers.indexOf(sheetColumn);
        if (
          columnIndex !== -1 &&
          targetRow[columnIndex] !== undefined &&
          targetRow[columnIndex] !== ''
        ) {
          calculatedValues[dbField] = targetRow[columnIndex];
          this.logger.debug(
            `Syncing calculated value: ${dbField} = ${targetRow[columnIndex]}`,
          );
        }
      }

      if (Object.keys(calculatedValues).length > 0) {
        // Update the database record with calculated values using the raw record's id
        await this.financialSurveysDbService.updateById(
          survey.id,
          calculatedValues,
        );
        this.logger.debug(
          `Updated database record ${survey.id} with calculated values:`,
          calculatedValues,
        );
      } else {
        this.logger.debug('No calculated values found to sync back');
      }
    } catch (error) {
      this.logger.error(
        `Error syncing calculated values back to DB for sheet ID ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  private async findExistingFinancialSurveyInSheets(
    id: string,
  ): Promise<any | null> {
    try {
      const surveys = await this.sheetsService.getFinancialSurveys();
      if (!surveys || surveys.length === 0) {
        return null;
      }

      const headers = surveys[0];
      const idIndex = headers.indexOf('ID');

      if (idIndex === -1) {
        this.logger.warn('ID column not found in Financial Survey sheet');
        return null;
      }

      const surveyRow = surveys.find((row) => row[idIndex] === id);
      if (!surveyRow) {
        return null;
      }

      const survey = {};
      headers.forEach((header, index) => {
        survey[header] = surveyRow[index];
      });

      return survey;
    } catch (error) {
      this.logger.error(`Error finding existing survey in sheets:`, error);
      return null;
    }
  }
}
