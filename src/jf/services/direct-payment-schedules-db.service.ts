import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDirectPaymentScheduleDto } from '../dto/create-direct-payment-schedule.dto';
import { UpdateDirectPaymentScheduleDto } from '../dto/update-direct-payment-schedule.dto';

@Injectable()
export class DirectPaymentSchedulesDbService {
  private readonly logger = new Logger(DirectPaymentSchedulesDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDirectPaymentScheduleDto: CreateDirectPaymentScheduleDto) {
    // Clean the data to ensure types match Prisma schema
    let data: any = {};
    
    try {
      // Initialize data object
      data = {};
      
      // Define boolean field lists for type checking
      const booleanFields = ['synced'];
      
      // Copy all fields and convert types as needed
      for (const [key, value] of Object.entries(createDirectPaymentScheduleDto)) {
        if (value === undefined) {
          // Skip undefined values - Prisma doesn't like undefined
          continue;
        }
        
        // Handle boolean fields (Boolean)
        if (booleanFields.includes(key)) {
          if (value === null || value === undefined) {
            data[key] = null;
          } else if (typeof value === 'boolean') {
            data[key] = value;
          } else if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            if (lowerValue === 'true' || lowerValue === '1') {
              data[key] = true;
            } else if (lowerValue === 'false' || lowerValue === '0') {
              data[key] = false;
            } else {
              data[key] = null;
            }
          } else if (typeof value === 'number') {
            data[key] = value !== 0;
          } else {
            data[key] = null;
          }
        }
        // Handle all other fields (strings, numbers, dates, etc.)
        else {
          data[key] = value === null || value === '' ? null : value;
        }
      }
      
      // Remove any undefined values one more time (safety check)
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      const result = await this.prisma.directPaymentSchedule.create({
        data,
      });
      this.logger.log(`Created direct payment schedule with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Error creating direct payment schedule:', error);
      if (data && Object.keys(data).length > 0) {
        this.logger.error(`Data sent to Prisma (first 30 fields):`, 
          JSON.stringify(
            Object.keys(data).slice(0, 30).reduce((obj, key) => {
              obj[key] = {
                value: data[key],
                type: typeof data[key],
              };
              return obj;
            }, {} as any),
            null,
            2
          )
        );
      }
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.prisma.directPaymentSchedule.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching all direct payment schedules:', error);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      return await this.prisma.directPaymentSchedule.findUnique({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct payment schedule with ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.directPaymentSchedule.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct payment schedule with sheet ID ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async findByBorrowerId(borrowerId: string) {
    try {
      return await this.prisma.directPaymentSchedule.findMany({
        where: { borrowerId },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct payment schedules for borrower ${borrowerId}:`,
        error,
      );
      throw error;
    }
  }

  async findByDirectLoanId(directLoanId: string) {
    try {
      return await this.prisma.directPaymentSchedule.findMany({
        where: { directLoanId },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct payment schedules for direct loan ${directLoanId}:`,
        error,
      );
      throw error;
    }
  }

  async update(
    id: number,
    updateDirectPaymentScheduleDto: UpdateDirectPaymentScheduleDto,
  ) {
    try {
      const result = await this.prisma.directPaymentSchedule.update({
        where: { id },
        data: updateDirectPaymentScheduleDto,
      });
      this.logger.log(`Updated direct payment schedule with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error updating direct payment schedule with ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  async remove(id: number) {
    try {
      const result = await this.prisma.directPaymentSchedule.delete({
        where: { id },
      });
      this.logger.log(`Deleted direct payment schedule with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error deleting direct payment schedule with ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  async findByPaymentOverdue(paymentOverdue: string) {
    try {
      return await this.prisma.directPaymentSchedule.findMany({
        where: { paymentOverdue },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct payment schedules with overdue status ${paymentOverdue}:`,
        error,
      );
      throw error;
    }
  }

  async findOverdueSchedules() {
    try {
      return await this.prisma.directPaymentSchedule.findMany({
        where: {
          paymentOverdue: 'TRUE',
        },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      this.logger.error('Error fetching overdue payment schedules:', error);
      throw error;
    }
  }

  async findUpcomingSchedules(days: number = 30) {
    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      const futureDateString = futureDate.toISOString().split('T')[0];

      return await this.prisma.directPaymentSchedule.findMany({
        where: {
          dueDate: {
            gte: today.toISOString().split('T')[0],
            lte: futureDateString,
          },
          paymentOverdue: 'FALSE',
        },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching upcoming payment schedules for next ${days} days:`,
        error,
      );
      throw error;
    }
  }

  // Convert database record to sheet format
  convertDbToSheet(dbRecord: any) {
    return {
      ID: dbRecord.sheetId || '',
      'Direct Loan ID': dbRecord.directLoanId || '',
      'Borrower Type ': dbRecord.borrowerType || '',
      'Borrower ID': dbRecord.borrowerId || '',
      'Due Date': dbRecord.dueDate || '',
      'Holiday Forgiveness?': dbRecord.holidayForgiveness || '',
      'Amount Still Unpaid': dbRecord.amountStillUnpaid || '',
      'Days Late': dbRecord.daysLate || '',
      'Date Fully Paid': dbRecord.dateFullyPaid || '',
      'Payment Overdue?': dbRecord.paymentOverdue || '',
      'PAR 14': dbRecord.par14 || '',
      'PAR 30': dbRecord.par30 || '',
      'Check Cashing Status': dbRecord.checkCashingStatus || '',
      'Debt Type': dbRecord.debtType || '',
      'Notes on Payment': dbRecord.notesOnPayment || '',
      'Adjusted Month': dbRecord.adjustedMonth || '',
      'Credit Life Insurance Fees Charged':
        dbRecord.creditLifeInsuranceFeesCharged || '',
      'Interest Charged without Forgiveness':
        dbRecord.interestChargedWithoutForgiveness || '',
      'Principal Repayment without Forgiveness':
        dbRecord.principalRepaymentWithoutForgiveness || '',
      'Vehicle Insurance Payment Due, without Forgiveness':
        dbRecord.vehicleInsurancePaymentDueWithoutForgiveness || '',
      'Vehicle Insurance Payment Due':
        dbRecord.vehicleInsurancePaymentDue || '',
      'Interest Repayment Due': dbRecord.interestRepaymentDue || '',
      'Principal Repayment Due': dbRecord.principalRepaymentDue || '',
      'Amount Due': dbRecord.amountDue || '',
      'Amount Paid': dbRecord.amountPaid || '',
      'Vehicle Insurance Premium Due without Forgiveness':
        dbRecord.vehicleInsurancePremiumDueWithoutForgiveness || '',
      'Vehicle Insurance Surcharge Due without Forgiveness':
        dbRecord.vehicleInsuranceSurchargeDueWithoutForgiveness || '',
      'Vehicle Insurance Premium Due with Forgiveness':
        dbRecord.vehicleInsurancePremiumDueWithForgiveness || '',
      'Vehicle Insurance Surcharge Due with Forgiveness':
        dbRecord.vehicleInsuranceSurchargeDueWithForgiveness || '',
      'Credit Life Insurance Fees Owed to Insurer':
        dbRecord.creditLifeInsuranceFeesOwedToInsurer || '',
      'Credit Life Insurance Fee Payments Utilized':
        dbRecord.creditLifeInsuranceFeePaymentsUtilized || '',
      'Credit Life Insurance Fee Insurance Expense':
        dbRecord.creditLifeInsuranceFeeInsuranceExpense || '',
      'Vehicle Insurance Fees Owed to Insurer':
        dbRecord.vehicleInsuranceFeesOwedToInsurer || '',
      'Created At': dbRecord.createdAt || '',
      Synced: dbRecord.synced || false,
    };
  }

  // Mapping from Google Sheets column names to database field names
  private sheetToDbMapping: Record<string, string> = {
    ID: 'sheetId',
    'Direct Loan ID': 'directLoanId',
    'Borrower Type ': 'borrowerType', // Note: space at the end
    'Borrower ID': 'borrowerId',
    'Due Date': 'dueDate',
    'Holiday Forgiveness?': 'holidayForgiveness',
    'Amount Still Unpaid': 'amountStillUnpaid',
    'Days Late': 'daysLate',
    'Date Fully Paid': 'dateFullyPaid',
    'Payment Overdue?': 'paymentOverdue',
    'PAR 14': 'par14',
    'PAR 30': 'par30',
    'Check Cashing Status': 'checkCashingStatus',
    'Debt Type': 'debtType',
    'Notes on Payment': 'notesOnPayment',
    'Adjusted Month': 'adjustedMonth',
    'Credit Life Insurance Fees Charged': 'creditLifeInsuranceFeesCharged',
    'Interest Charged without Forgiveness':
      'interestChargedWithoutForgiveness',
    'Principal Repayment without Forgiveness':
      'principalRepaymentWithoutForgiveness',
    'Vehicle Insurance Payment Due, without Forgiveness':
      'vehicleInsurancePaymentDueWithoutForgiveness',
    'Vehicle Insurance Payment Due': 'vehicleInsurancePaymentDue',
    'Interest Repayment Due': 'interestRepaymentDue',
    'Principal Repayment Due': 'principalRepaymentDue',
    'Amount Due': 'amountDue',
    'Amount Paid': 'amountPaid',
    'Vehicle Insurance Premium Due without Forgiveness':
      'vehicleInsurancePremiumDueWithoutForgiveness',
    'Vehicle Insurance Surcharge Due without Forgiveness':
      'vehicleInsuranceSurchargeDueWithoutForgiveness',
    'Vehicle Insurance Premium Due with Forgiveness':
      'vehicleInsurancePremiumDueWithForgiveness',
    'Vehicle Insurance Surcharge Due with Forgiveness':
      'vehicleInsuranceSurchargeDueWithForgiveness',
    'Credit Life Insurance Fees Owed to Insurer':
      'creditLifeInsuranceFeesOwedToInsurer',
    'Credit Life Insurance Fee Payments Utilized':
      'creditLifeInsuranceFeePaymentsUtilized',
    'Credit Life Insurance Fee Insurance Expense':
      'creditLifeInsuranceFeeInsuranceExpense',
    'Vehicle Insurance Fees Owed to Insurer':
      'vehicleInsuranceFeesOwedToInsurer',
    'Vehicle Insurance Fees Utilized': 'vehicleInsuranceFeesUtilized',
    'Created By': 'createdBy',
    'Created At': 'createdAt', // Stored as string from sheet
    'PAR 60': 'par60',
    'PAR 90': 'par90',
    'PAR 120': 'par120',
    'SSL ID': 'sslId',
    'Date to Bank Check': 'dateToBankCheck',
    'Loan Category': 'loanCategory',
    'Write Off Date': 'writeOffDate',
    'Interest Suspended?': 'interestSuspended',
    Region: 'region',
    'Date for MPESA / Bank Transfer': 'dateForMpesaBankTransfer',
  };

  // Helper method to safely get a value from sheet record
  private getSheetValue(sheetRecord: any, columnName: string): string | null {
    const value = sheetRecord[columnName];
    if (value !== undefined && value !== null && value !== '') {
      // Convert to string and trim
      const stringValue = String(value).trim();
      if (stringValue !== '') {
        return stringValue;
      }
    }
    return null;
  }

  // Convert sheet record to database format
  convertSheetToDb(sheetRecord: any): CreateDirectPaymentScheduleDto {
    // Log all available keys in the sheet record for debugging
    const availableKeys = Object.keys(sheetRecord).filter(
      (key) =>
        sheetRecord[key] !== undefined &&
        sheetRecord[key] !== null &&
        sheetRecord[key] !== '',
    );
    if (availableKeys.length > 0) {
      this.logger.debug(
        `Converting sheet record. Available non-empty keys: ${availableKeys.join(', ')}`,
      );
    }

    // Map all columns from sheet to database fields using the mapping
    const dbRecord: any = {};

    // Fields that should be parsed as currency (Float)
    const currencyFields = ['amountDue', 'amountPaid'];
    
    // Fields that should be parsed as dates (DateTime)
    const dateFields = ['dueDate'];
    
    // Fields that should be parsed as integers
    const integerFields = ['daysLate'];

    for (const [sheetColumn, dbField] of Object.entries(this.sheetToDbMapping)) {
      const value = this.getSheetValue(sheetRecord, sheetColumn);
      if (value !== null) {
        // Parse as currency if it's a currency field
        if (currencyFields.includes(dbField)) {
          dbRecord[dbField] = this.parseCurrency(value);
        }
        // Parse as date if it's a date field
        else if (dateFields.includes(dbField)) {
          dbRecord[dbField] = this.parseDate(value);
        }
        // Parse as integer if it's an integer field
        else if (integerFields.includes(dbField)) {
          dbRecord[dbField] = this.parseInt(value);
        }
        else {
          dbRecord[dbField] = value;
        }
      }
    }

    // Remove null/undefined values to keep the record clean
    Object.keys(dbRecord).forEach((key) => {
      if (dbRecord[key] === null || dbRecord[key] === undefined) {
        delete dbRecord[key];
      }
    });

    return dbRecord as CreateDirectPaymentScheduleDto;
  }

  /**
   * Parse currency value from Google Sheets format to number
   * Handles formats like: "1,234.56", "KSh 1,234.56", "1,234", "$1,234.56", etc.
   */
  private parseCurrency(value: string | null): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle "#VALUE!" and other Excel errors
      if (value.includes('#') || value.includes('VALUE') || value.includes('ERROR')) {
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
   * Parse date value from Google Sheets format to DateTime
   * Handles various date formats and converts to ISO string for Prisma
   */
  private parseDate(value: string | null): Date | null {
    if (value === null || value === undefined || value === '' || value === '(empty)') {
      return null;
    }
    
    if (typeof value === 'string') {
      try {
        // Try to parse various date formats
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

  /**
   * Parse integer value from Google Sheets format
   */
  private parseInt(value: string | null): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string') {
      // Handle "#VALUE!" and other Excel errors
      if (value.includes('#') || value.includes('VALUE') || value.includes('ERROR')) {
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

  // Convert database array to sheet format
  convertDbArrayToSheet(dbRecords: any[]) {
    return dbRecords.map((record) => this.convertDbToSheet(record));
  }
}
