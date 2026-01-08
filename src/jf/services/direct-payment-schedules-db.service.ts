import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDirectPaymentScheduleDto } from '../dto/create-direct-payment-schedule.dto';
import { UpdateDirectPaymentScheduleDto } from '../dto/update-direct-payment-schedule.dto';

@Injectable()
export class DirectPaymentSchedulesDbService {
  private readonly logger = new Logger(DirectPaymentSchedulesDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDirectPaymentScheduleDto: CreateDirectPaymentScheduleDto) {
    try {
      const result = await this.prisma.directPaymentSchedule.create({
        data: createDirectPaymentScheduleDto,
      });
      this.logger.log(`Created direct payment schedule with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Error creating direct payment schedule:', error);
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

    for (const [sheetColumn, dbField] of Object.entries(this.sheetToDbMapping)) {
      const value = this.getSheetValue(sheetRecord, sheetColumn);
      if (value !== null) {
        dbRecord[dbField] = value;
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

  // Convert database array to sheet format
  convertDbArrayToSheet(dbRecords: any[]) {
    return dbRecords.map((record) => this.convertDbToSheet(record));
  }
}
