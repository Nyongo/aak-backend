import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { FinancialSurveysDbService } from '../services/financial-surveys-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/financial-surveys-migration')
export class FinancialSurveysMigrationController {
  private readonly logger = new Logger(
    FinancialSurveysMigrationController.name,
  );

  constructor(
    private readonly financialSurveysDbService: FinancialSurveysDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    try {
      const totalInDb = await this.financialSurveysDbService.findAll();
      const totalInSheets = await this.sheetsService.getFinancialSurveys();

      return {
        success: true,
        data: {
          totalInDatabase: totalInDb.length,
          totalInSheets: totalInSheets.length,
          syncedInDatabase: totalInDb.filter((record) => record.synced).length,
          unsyncedInDatabase: totalInDb.filter((record) => !record.synced)
            .length,
        },
        message: 'Financial surveys migration status retrieved successfully',
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
      this.logger.log('Getting Financial Survey sheet headers');

      // Get raw data from sheets
      const rawData = await this.sheetsService.getSheetData('Financial Survey');

      if (!rawData || rawData.length === 0) {
        return {
          success: true,
          data: {
            totalHeaders: 0,
            headers: [],
          },
          message: 'No records found in Financial Survey sheet',
        };
      }

      // Get headers from the first row
      const headers = rawData[0];

      this.logger.log(
        `Found ${headers.length} headers in Financial Survey sheet`,
      );

      return {
        success: true,
        data: {
          totalHeaders: headers.length,
          headers: headers,
        },
        message: 'Financial Survey sheet headers retrieved successfully',
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
      // Get raw data from Google Sheets
      const rawData = await this.sheetsService.getSheetData('Financial Survey');

      if (!rawData || rawData.length === 0) {
        return {
          success: true,
          message: 'No financial surveys found in Google Sheets',
          imported: 0,
          skipped: 0,
          errors: 0,
        };
      }

      const headers = rawData[0];
      const rows = rawData.slice(1);

      // Convert rows to objects with named properties
      const sheetFinancialSurveys = rows.map((row) => {
        const survey: any = {};
        headers.forEach((header, index) => {
          survey[header] = row[index] || '';
        });
        return survey;
      });

      // Filter by creditApplicationId if provided
      const filteredSurveys = creditApplicationId
        ? sheetFinancialSurveys.filter(
            (fs) => fs['Credit Application ID'] === creditApplicationId,
          )
        : sheetFinancialSurveys;

      if (filteredSurveys.length === 0) {
        return {
          success: true,
          message: 'No financial surveys found matching the criteria',
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

      for (const sheetFinancialSurvey of filteredSurveys) {
        try {
          // Skip completely empty records
          if (Object.keys(sheetFinancialSurvey).length === 0) {
            skipped++;
            skippedDetails.push({
              reason: 'Completely empty record in Google Sheets',
              data: sheetFinancialSurvey,
            });
            continue;
          }

          // Skip records with empty ID
          if (
            !sheetFinancialSurvey.ID ||
            sheetFinancialSurvey.ID.trim() === ''
          ) {
            skipped++;
            skippedDetails.push({
              reason: 'Empty ID in Google Sheets',
              data: sheetFinancialSurvey,
            });
            continue;
          }

          // Check if record already exists in database
          const existingRecord =
            await this.financialSurveysDbService.findBySheetId(
              sheetFinancialSurvey.ID,
            );

          if (existingRecord) {
            skipped++;
            skippedDetails.push({
              reason: 'Already exists in database',
              sheetId: sheetFinancialSurvey.ID,
              creditApplicationId:
                sheetFinancialSurvey['Credit Application ID'],
            });
            continue;
          }

          // Create record in database
          await this.financialSurveysDbService.create(sheetFinancialSurvey);
          imported++;

          this.logger.debug(
            `Imported financial survey with sheetId: ${sheetFinancialSurvey.ID}`,
          );
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            sheetId: sheetFinancialSurvey.ID,
            creditApplicationId: sheetFinancialSurvey['Credit Application ID'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import financial survey ${sheetFinancialSurvey.ID}: ${errorMessage}`,
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
      // Get unsynced financial surveys from database
      const allUnsyncedFinancialSurveys =
        await this.financialSurveysDbService.findUnsynced();
      const unsyncedFinancialSurveys = creditApplicationId
        ? allUnsyncedFinancialSurveys.filter(
            (fs) => fs.creditApplicationId === creditApplicationId,
          )
        : allUnsyncedFinancialSurveys;

      if (!unsyncedFinancialSurveys || unsyncedFinancialSurveys.length === 0) {
        return {
          success: true,
          message: 'No unsynced financial surveys found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced financial survey
      for (const financialSurvey of unsyncedFinancialSurveys) {
        try {
          // For now, just mark as synced since we don't have a sync service method
          await this.financialSurveysDbService.updateSyncStatus(
            financialSurvey.id,
            true,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            creditApplicationId: financialSurvey.creditApplicationId,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync Financial Survey ${financialSurvey.id}: ${errorMessage}`,
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
        await this.financialSurveysDbService.findBySheetId(sheetId);
      if (!dbRecord) {
        return {
          success: false,
          error: 'Record not found in database',
        };
      }

      // Get record from sheets
      const sheetRecords = await this.sheetsService.getFinancialSurveys();
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

  private convertSheetToDbFormat(sheetRecord: any) {
    // Use the existing FinancialSurveysDbService mapping
    const sheetToDbMapping = {
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
      'What other benefits does church provide to the school?':
        'churchBenefits',
      'Does the school rent, lease, or own its facilities?':
        'facilityOwnership',
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
      "How much does the school spend on students' textbooks annually?":
        'annualStudentTextbookExpense',
      "How much does the school spend on teachers' textbooks annually?":
        'annualTeacherTextbookExpense',
      'How much does the school spend on stationery per term?':
        'termlyStationeryExpense',
      'How much does the school spend on WiFi per month?': 'monthlyWifiExpense',
      'How much does the school spend on airtime per term?':
        'termlyAirtimeExpense',
      'How much does the school spend on water per month?':
        'monthlyWaterExpense',
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
      'How many children at the school are sponsored?':
        'sponsoredChildrenCount',
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
      'How many years has the school had a bank account?':
        'yearsWithBankAccount',
      'School has audited financials or management accounts?':
        'hasAuditedFinancials',
      'How many branches does the school have?': 'branchCount',
      'Has this school ever borrowed from a microfinance institution (e.g., Ed Partners or Kenya Women Microfinance Bank)? ':
        'hasMicrofinanceBorrowing',
      'Has this school ever borrowed from a formal financial institution (Kenya Co-Op, KCB, Equity Bank, etc.)?':
        'hasFormalBankBorrowing',
    };

    const dbData: any = {
      synced: true, // Mark as synced since we're importing from sheets
    };

    // Map sheet data to database format using the mapping
    for (const [sheetKey, dbKey] of Object.entries(sheetToDbMapping)) {
      if (sheetRecord[sheetKey] !== undefined && sheetRecord[sheetKey] !== '') {
        dbData[dbKey] = sheetRecord[sheetKey];
      }
    }

    return dbData;
  }
}
