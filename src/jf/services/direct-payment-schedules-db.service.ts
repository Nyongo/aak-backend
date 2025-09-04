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

  // Convert sheet record to database format
  convertSheetToDb(sheetRecord: any) {
    // Map the actual column names from the sheet to database fields
    return {
      sheetId: sheetRecord['ID'] || null, // The ID column becomes sheetId

      // Core fields from the sheet - exact column names
      directLoanId: sheetRecord['Direct Loan ID'] || null,
      borrowerType: sheetRecord['Borrower Type '] || null, // Note the space at the end
      borrowerId: sheetRecord['Borrower ID'] || null,
      dueDate: sheetRecord['Due Date'] || null,
      holidayForgiveness: sheetRecord['Holiday Forgiveness?'] || null,
      amountStillUnpaid: sheetRecord['Amount Still Unpaid'] || null,
      daysLate: sheetRecord['Days Late'] || null,
      dateFullyPaid: sheetRecord['Date Fully Paid'] || null,
      paymentOverdue: sheetRecord['Payment Overdue?'] || null,
      par14: sheetRecord['PAR 14'] || null,
      par30: sheetRecord['PAR 30'] || null,
      checkCashingStatus: sheetRecord['Check Cashing Status'] || null,
      debtType: sheetRecord['Debt Type'] || null,
      notesOnPayment: sheetRecord['Notes on Payment'] || null,
      adjustedMonth: sheetRecord['Adjusted Month'] || null,
      creditLifeInsuranceFeesCharged:
        sheetRecord['Credit Life Insurance Fees Charged'] || null,
      interestChargedWithoutForgiveness:
        sheetRecord['Interest Charged without Forgiveness'] || null,
      principalRepaymentWithoutForgiveness:
        sheetRecord['Principal Repayment without Forgiveness'] || null,
      vehicleInsurancePaymentDueWithoutForgiveness:
        sheetRecord['Vehicle Insurance Payment Due, without Forgiveness'] ||
        null,
      vehicleInsurancePaymentDue:
        sheetRecord['Vehicle Insurance Payment Due'] || null,
      interestRepaymentDue: sheetRecord['Interest Repayment Due'] || null,
      principalRepaymentDue: sheetRecord['Principal Repayment Due'] || null,
      amountDue: sheetRecord['Amount Due'] || null,
      amountPaid: sheetRecord['Amount Paid'] || null,
      vehicleInsurancePremiumDueWithoutForgiveness:
        sheetRecord['Vehicle Insurance Premium Due without Forgiveness'] ||
        null,
      vehicleInsuranceSurchargeDueWithoutForgiveness:
        sheetRecord['Vehicle Insurance Surcharge Due without Forgiveness'] ||
        null,
      vehicleInsurancePremiumDueWithForgiveness:
        sheetRecord['Vehicle Insurance Premium Due with Forgiveness'] || null,
      vehicleInsuranceSurchargeDueWithForgiveness:
        sheetRecord['Vehicle Insurance Surcharge Due with Forgiveness'] || null,
      creditLifeInsuranceFeesOwedToInsurer:
        sheetRecord['Credit Life Insurance Fees Owed to Insurer'] || null,
      creditLifeInsuranceFeePaymentsUtilized:
        sheetRecord['Credit Life Insurance Fee Payments Utilized'] || null,
      creditLifeInsuranceFeeInsuranceExpense:
        sheetRecord['Credit Life Insurance Fee Insurance Expense'] || null,
      vehicleInsuranceFeesOwedToInsurer:
        sheetRecord['Vehicle Insurance Fees Owed to Insurer'] || null,
    };
  }

  // Convert database array to sheet format
  convertDbArrayToSheet(dbRecords: any[]) {
    return dbRecords.map((record) => this.convertDbToSheet(record));
  }
}
