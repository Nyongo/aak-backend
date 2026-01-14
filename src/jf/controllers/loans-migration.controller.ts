import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { LoansService } from '../services/loans.service';
import { SheetsService } from '../services/sheets.service';

@Controller('jf/loans-migration')
export class LoansMigrationController {
  private readonly logger = new Logger(LoansMigrationController.name);

  constructor(
    private readonly loansService: LoansService,
    private readonly sheetsService: SheetsService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    try {
      const [dbCount, sheetsCount] = await Promise.all([
        this.loansService.getLoansCount(),
        this.sheetsService.getLoansCount(),
      ]);

      return {
        success: true,
        database: {
          total: dbCount,
        },
        sheets: {
          total: sheetsCount,
        },
        syncStatus: dbCount === sheetsCount ? 'Synced' : 'Out of sync',
      };
    } catch (error) {
      this.logger.error('Error getting migration status:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('import-from-sheets')
  async importFromSheets(@Query('borrowerId') borrowerId?: string) {
    this.logger.log(
      `Starting import from Google Sheets${borrowerId ? ` for Borrower ID: ${borrowerId}` : ''}`,
    );

    try {
      // Get data from Google Sheets
      const sheetsData = await this.sheetsService.getLoans();

      if (!sheetsData || sheetsData.length === 0) {
        return {
          success: true,
          message: 'No data found in Google Sheets',
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: 0,
        };
      }

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each loan from sheets
      for (const sheetLoan of sheetsData) {
        console.log('sheetLoan', sheetLoan);
        try {
          // Skip completely empty records
          if (Object.keys(sheetLoan).length === 0) {
            skipped++;
            skippedDetails.push({
              loan: 'Empty Record',
              sheetId: sheetLoan['ID'] || 'No ID',
              reason: 'Completely empty record in Google Sheets',
            });
            continue;
          }

          // Find the ID field
          const idValue = this.findIdField(sheetLoan);
          console.log('idValue', idValue);
          // Skip records with empty ID
          if (!idValue) {
            skipped++;
            skippedDetails.push({
              loan: sheetLoan['Loan Type'] || 'Unknown',
              sheetId: 'Empty ID',
              reason: 'Empty ID in Google Sheets - tried fields: ID',
            });
            continue;
          }

          // Convert sheet data to database format
          const dbLoan = this.convertSheetToDb(sheetLoan);

          // Check if loan already exists in database
          const existingLoan = await this.loansService.findBySheetId(idValue);

          if (existingLoan) {
            // Update existing record
            await this.loansService.update(existingLoan.id, {
              ...dbLoan,
              synced: true, // Mark as synced since it came from sheets
            });
            updated++;
            this.logger.debug(`Updated existing loan: ${idValue}`);
          } else {
            // Create new record
            await this.loansService.create({
              ...dbLoan,
              synced: true, // Mark as already synced since it came from sheets
            });
            imported++;
            this.logger.debug(`Created new loan: ${idValue}`);
          }
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            loan: sheetLoan['Loan Type'] || 'Unknown',
            sheetId: this.findIdField(sheetLoan) || 'Unknown',
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import loan ${sheetLoan['Loan Type']}: ${errorMessage}`,
          );
        }
      }

      return {
        success: true,
        message: 'Import completed',
        imported,
        updated,
        skipped,
        errors,
        errorDetails: errors > 0 ? errorDetails : undefined,
        skippedDetails: skipped > 0 ? skippedDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Import failed:', errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  @Post('sync-to-sheets')
  async syncToGoogleSheets() {
    try {
      // For now, this is read-only from sheets
      // In the future, this could sync database changes back to sheets
      return {
        success: true,
        message: 'Sync to Google Sheets is read-only for now',
        synced: 0,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Sync to sheets failed:', errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  @Post('full-migration')
  async fullMigration() {
    try {
      // First, get current status
      const status = await this.getMigrationStatus();

      if (!status.success) {
        return status;
      }

      // If already synced, return early
      if (status.syncStatus === 'Synced') {
        return {
          success: true,
          message: 'Already fully synced',
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: 0,
        };
      }

      // Perform full import
      return await this.importFromSheets();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Full migration failed:', errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  @Get('compare/:sheetId')
  async compareLoan(@Query('sheetId') sheetId: string) {
    this.logger.log(`Comparing loan with sheet ID: ${sheetId}`);

    try {
      // Get from sheets
      const sheetLoans = await this.sheetsService.getLoans();
      const sheetLoan = sheetLoans.find((l) => l['ID'] === sheetId);

      if (!sheetLoan) {
        return { success: false, error: 'Loan not found in sheets' };
      }

      // Get from database
      const dbLoan = await this.loansService.findBySheetId(sheetId);

      return {
        success: true,
        comparison: {
          sheets: sheetLoan,
          database: dbLoan || null,
          differences: dbLoan ? this.findDifferences(sheetLoan, dbLoan) : null,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare loan: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('columns')
  async getSheetColumns() {
    try {
      const sheetsData = await this.sheetsService.getLoans();

      if (sheetsData && sheetsData.length > 0) {
        const columns = Object.keys(sheetsData[0]);
        return {
          success: true,
          message: 'Loans sheet columns retrieved successfully',
          totalColumns: columns.length,
          columns: columns.map((col, index) => ({
            index: index + 1,
            name: col,
            sampleValue: sheetsData[0][col],
          })),
        };
      }

      return {
        success: false,
        message: 'No data found in Loans sheet',
      };
    } catch (error) {
      this.logger.error('Error getting loans sheet columns:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private findDifferences(sheetData: any, dbData: any) {
    const differences = [];
    const sheetFields = this.convertSheetToDb(sheetData);

    for (const [key, value] of Object.entries(sheetFields)) {
      if (key !== 'createdAt' && key !== 'synced') {
        const dbValue = dbData[key];
        if (value !== dbValue) {
          differences.push({
            field: key,
            sheets: value,
            database: dbValue,
          });
        }
      }
    }

    return differences;
  }

  private findIdField(sheetData: any): string | null {
    // Try to find the ID field
    const idValue = sheetData['ID'];
    return idValue || null;
  }

  private convertSheetToDb(sheetRecord: any) {
    return {
      sheetId: sheetRecord['ID'] || null,
      loanType: sheetRecord['Loan Type'] || null,
      loanPurpose: sheetRecord['Loan Purpose'] || null,
      borrowerType: sheetRecord['Borrower Type'] || null,
      borrowerId: sheetRecord['Borrower ID'] || null,
      borrowerName: sheetRecord['Borrower Name'] || null,
      principalAmount: this.parseCurrency(
        sheetRecord['Principal Amount'] || null,
      ),
      interestType: sheetRecord['Interest Type'] || null,
      annualDecliningInterest:
        sheetRecord['Annual Declining Interest '] || null,
      annualFlatInterest: sheetRecord['Annual Flat Interest'] || null,
      processingFeePercentage: sheetRecord['Processing Fee Percentage'] || null,
      creditLifeInsurancePercentage:
        sheetRecord['Credit Life Insurance Percentage'] || null,
      securitizationFee: sheetRecord['Securitization Fee'] || null,
      processingFee: sheetRecord['Processing Fee'] || null,
      creditLifeInsuranceFee: sheetRecord['Credit Life Insurance Fee'] || null,
      numberOfMonths: this.parseInt(sheetRecord['Number of Months'] || null),
      dailyPenalty: sheetRecord['Daily Penalty'] || null,
      amountToDisburse: sheetRecord['Amount to Disburse'] || null,
      totalComprehensiveVehicleInsurancePaymentsToPay:
        sheetRecord['Total Comprehensive Vehicle Insurance Payments to Pay'] ||
        null,
      totalInterestCharged: sheetRecord['Total Interest Charged'] || null,
      totalInterestToPay: sheetRecord['Total Interest to Pay'] || null,
      totalPrincipalToPay: sheetRecord['Total Principal to Pay'] || null,
      creditApplicationId: sheetRecord['Credit Application ID'] || null,
      firstPaymentPeriod: sheetRecord['First Payment Period'] || null,
      createdBy: sheetRecord['Created By'] || null,
      totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance:
        sheetRecord[
          'Total Liability Amount, Including Penalties and Comprehensive Vehicle Insurance'
        ] || null,
      totalLoanAmountPaidIncludingPenaltiesAndInsurance:
        sheetRecord[
          'Total Loan Amount Paid, Including Penalties and Insurance'
        ] || null,
      totalPenaltiesAssessed: sheetRecord['Total Penalties Assessed'] || null,
      totalPenaltiesPaid: sheetRecord['Total Penalties Paid'] || null,
      penaltiesStillDue: sheetRecord['Penalties Still Due'] || null,
      sslId: sheetRecord['SSL ID'] || null,
      loanOverdue: sheetRecord['Loan Overdue'] || null,
      par14: sheetRecord['PAR 14'] || null,
      par30: sheetRecord['PAR 30'] || null,
      par60: sheetRecord['PAR 60'] || null,
      par90: sheetRecord['PAR 90'] || null,
      par120: sheetRecord['PAR 120'] || null,
      amountOverdue: sheetRecord['Amount Overdue'] || null,
      loanFullyPaid: sheetRecord['Loan Fully Paid?'] || null,
      loanStatus: sheetRecord['Loan Status'] || null,
      totalAmountDueToDate: sheetRecord['Total Amount Due to Date'] || null,
      amountDisbursedToDateIncludingFees:
        sheetRecord['Amount Disbursed to Date Including Fees'] || null,
      balanceOfDisbursementsOwed:
        sheetRecord['Balance of Disbursements Owed'] || null,
      principalPaidToDate: sheetRecord['Principal Paid to Date'] || null,
      outstandingPrincipalBalance: this.parseCurrency(
        sheetRecord['Outstanding Principal Balance'] || null,
      ),
      numberOfAssetsUsedAsCollateral:
        sheetRecord['Number of Assets used as Collateral'] || null,
      numberOfAssetsRecorded: sheetRecord['Number of Assets Recorded'] || null,
      allCollateralRecorded: sheetRecord['All Collateral Recorded?'] || null,
      principalDifference: sheetRecord['Principal Difference'] || null,
      creditLifeInsuranceSubmitted:
        sheetRecord['Credit Life Insurance Submitted?'] || null,
      directorHasCompletedCreditLifeHealthExamination:
        sheetRecord['Director has completed credit life health examination?'] ||
        null,
      recordOfReceiptForCreditLifeInsurance:
        sheetRecord['Record of Receipt for Credit Life Insurance'] || null,
      percentDisbursed: sheetRecord['% Disbursed'] || null,
      daysLate: this.parseInt(sheetRecord['Days Late'] || null),
      totalUnpaidLiability: sheetRecord['Total Unpaid Liability'] || null,
      restructured: sheetRecord['Restructured?'] || null,
      collateralCheckedByLegalTeam:
        sheetRecord['Collateral Checked by Legal Team?'] || null,
      hasFemaleDirector: this.parseBooleanToInt(
        sheetRecord['Has Female Director?'] || null,
      ),
      reportsGenerated: sheetRecord['Reports Generated'] || null,
      contractUploaded: sheetRecord['Contract Uploaded?'] || null,
      percentChargeOnVehicleInsuranceFinancing:
        sheetRecord['% Charge on Vehicle Insurance Financing '] || null,
      customerCareCallDone: sheetRecord['Customer Care Call Done? '] || null,
      checksHeld: sheetRecord['Checks Held'] || null,
      remainingPeriodsForChecks:
        sheetRecord['Remaining Periods for Checks'] || null,
      adequateChecksForRemainingPeriods:
        sheetRecord['Adequate Checks for Remaining Periods? '] || null,
      totalLiabilityAmountFromContract:
        sheetRecord['Total Liability Amount from Contract'] || null,
      liabilityCheck: sheetRecord['Liability check'] || null,
      creditLifeInsurer: sheetRecord['Credit Life Insurer'] || null,
      interestChargedVsDueDifference:
        sheetRecord['Interest Charged vs Due Difference'] || null,
      principalDueWithForgivenessVsWithoutForgiveness:
        sheetRecord['Principal Due with Forgiveness vs. Without Forgiveness'] ||
        null,
      insuranceDueWithVsWithoutForgiveness:
        sheetRecord['Insurance Due With vs. Without Forgiveness'] || null,
      firstLoan: sheetRecord['First Loan'] || null,
      additionalFeesWithheldFromDisbursement:
        sheetRecord['Additional Fees WIthheld from Dsibursement'] || null,
      daysSinceCreation: sheetRecord['Days Since Creation'] || null,
      referral: sheetRecord['Referral?'] || null,
      numberOfInstallmentsOverdue:
        sheetRecord['Number of Installments Overdue'] || null,
      amountPaidTowardsOverdueInstallments:
        sheetRecord['Amount Paid Towards Overdue Installments'] || null,
      borrowerIdForContracts: sheetRecord['Borrower ID for Contracts'] || null,
      mostRecentInstallmentPartiallyPaid:
        sheetRecord['Most Recent Installment Partially Paid?'] || null,
      willingnessToPay: sheetRecord['Willingness to Pay'] || null,
      capabilityToPay: sheetRecord['Capability to Pay'] || null,
      loanRiskCategory: sheetRecord['Loan Risk Category'] || null,
      calculatedAmountToDisburse:
        sheetRecord['Calculated Amount to Disburse'] || null,
      differenceBetweenCalculatedAndRecordedDisbursement:
        sheetRecord[
          'Difference Between Calculated and Recorded Disbursement'
        ] || null,
      teachers: sheetRecord['Teachers'] || null,
      totalInterestPaid: sheetRecord['Total Interest Paid'] || null,
      outstandingInterestBalance: this.parseCurrency(
        sheetRecord['Oustanding Interest Balance'] || null,
      ),
      totalVehicleInsuranceDue:
        sheetRecord['Total Vehicle Insurance Due'] || null,
      totalVehicleInsurancePaid:
        sheetRecord['Total Vehicle Insurance Paid'] || null,
      outstandingVehicleInsuranceBalance:
        sheetRecord['Outstanding Vehicle Insurance Balance'] || null,
      reassigned: sheetRecord['Reassigned?'] || null,
      flexiLoan: sheetRecord['Flexi Loan?'] || null,
      loanQualifiesForCatalyzeProgram:
        sheetRecord['Loan Qualifies for Catalyze Program?'] || null,
      allStaff: sheetRecord['All Staff'] || null,
      loanHasGonePAR30: sheetRecord['Loan has Gone PAR30'] || null,
      hasMaleDirector: sheetRecord['Has Male Director?'] || null,
      schoolArea: sheetRecord['School Area'] || null,
      firstDisbursement: this.parseDate(
        sheetRecord['First Disbursement'] || null,
      ),
      totalAdditionalFeesNotWithheldFromDisbursement:
        sheetRecord['Total Additional Fees not Withheld from Disbursement'] ||
        null,
      additionalFeesNotWithheldFromDisbursementPaid:
        sheetRecord['Additional Fees not Withheld from Disbursement Paid'] ||
        null,
      additionalFeesNotWithheldFromDisbursementStillDue:
        sheetRecord[
          'Additional Fees not Withheld from Disbursement Still Due'
        ] || null,
      averageSchoolFees: sheetRecord['Average School Fees'] || null,
      contractingDate: sheetRecord['Contracting Date'] || null,
      submittedToCatalyze: sheetRecord['Submitted to CATALYZE'] || null,
      mostRecentContract: sheetRecord['Most Recent Contract'] || null,
      mostRecentContractType: sheetRecord['Most Recent Contract Type'] || null,
      schoolType: sheetRecord['School Type'] || null,
      howManyClassroomsWillBeConstructedWithTheLoan:
        sheetRecord['How many classrooms will be constructed with the loan?'] ||
        null,
      howManyVehiclesWillBePurchasedWithTheLoan:
        sheetRecord['How many vehicles will be purchased with the loan?'] ||
        null,
      principalWrittenOff: sheetRecord['Principal Written Off'] || null,
      interestWrittenOff: sheetRecord['Interest Written Off'] || null,
      vehicleInsuranceWrittenOff:
        sheetRecord['Vehicle Insurance Written Off'] || null,
      segmentedRepaymentView: sheetRecord['Segmented Repayment View'] || null,
      beforeJan12024: sheetRecord['Before Jan 1 2024?'] || null,
      loanNumber: sheetRecord['Loan Number'] || null,
      teamLeader: sheetRecord['Team Leader'] || null,
      vehicleInsuranceWithoutForgivenessCheck:
        sheetRecord['Vehicle Insurance without Forgiveness Check'] || null,
      vehicleInsuranceWithForgivenessCheck:
        sheetRecord['Vehicle Insurance with Forgiveness Check'] || null,
      suspendedInterestCharged:
        sheetRecord['Suspended Interest Charged'] || null,
      suspendedInterestDue: sheetRecord['Suspended Interest Due'] || null,
      region: sheetRecord['Region'] || null,
      exciseDuty: sheetRecord['Excise Duty'] || null,
    };
  }

  /**
   * Parse currency value from Google Sheets format to number
   * Handles formats like: "1,234.56", "KSh 1,234.56", "1,234", "$1,234.56", etc.
   */
  private parseCurrency(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle "#VALUE!" and other Excel errors
      if (
        value.includes('#') ||
        value.includes('VALUE') ||
        value.includes('ERROR')
      ) {
        return null;
      }
      // Remove currency symbols, spaces, and common prefixes
      let cleaned = value
        .replace(/[KSh$€£¥,\s]/g, '') // Remove currency symbols and commas
        .trim();

      // Handle empty strings after cleaning
      if (cleaned === '' || cleaned === '(empty)') return null;

      // Parse to float
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Parse integer value from Google Sheets format
   */
  private parseInt(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string') {
      // Handle "#VALUE!" and other Excel errors
      if (
        value.includes('#') ||
        value.includes('VALUE') ||
        value.includes('ERROR')
      ) {
        return null;
      }
      // Remove commas and spaces
      let cleaned = value.replace(/[,\s]/g, '').trim();

      // Handle empty strings after cleaning
      if (cleaned === '' || cleaned === '(empty)') return null;

      // Parse to integer
      const parsed = parseInt(cleaned, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Parse boolean value to integer (0 or 1)
   * Handles: TRUE/FALSE, Yes/No, 1/0, true/false
   */
  private parseBooleanToInt(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value === 0 ? 0 : 1;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1') {
        return 1;
      }
      if (
        lowerValue === 'false' ||
        lowerValue === 'no' ||
        lowerValue === '0' ||
        lowerValue === '(empty)'
      ) {
        return 0;
      }
      // Try to parse as number
      const parsed = parseInt(lowerValue, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Parse date value from Google Sheets format to Date object
   * Handles various date formats including DD/MM/YYYY (from Loans sheet)
   * Returns Date object for Prisma DateTime field
   */
  private parseDate(value: any): Date | null {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      value === '(empty)'
    ) {
      return null;
    }

    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string') {
      try {
        // Handle DD/MM/YYYY format (common in Loans sheet, e.g., "13/05/2022")
        const ddmmyyyyMatch = value
          .trim()
          .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyyMatch) {
          const day = parseInt(ddmmyyyyMatch[1], 10);
          const month = parseInt(ddmmyyyyMatch[2], 10) - 1; // Month is 0-indexed
          const year = parseInt(ddmmyyyyMatch[3], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }

        // Try to parse other formats (ISO, "May 13, 2022", etc.)
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        // If parsing fails, return null
        return null;
      }
    }

    return null;
  }
}
