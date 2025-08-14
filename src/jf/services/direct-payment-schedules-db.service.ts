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

  async findByLoanId(loanId: string) {
    try {
      return await this.prisma.directPaymentSchedule.findMany({
        where: { loanId },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct payment schedules for loan ${loanId}:`,
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

  async findByPaymentStatus(paymentStatus: string) {
    try {
      return await this.prisma.directPaymentSchedule.findMany({
        where: { paymentStatus },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct payment schedules with status ${paymentStatus}:`,
        error,
      );
      throw error;
    }
  }

  async findOverdueSchedules() {
    try {
      const today = new Date().toISOString().split('T')[0];
      return await this.prisma.directPaymentSchedule.findMany({
        where: {
          dueDate: {
            lt: today,
          },
          paymentStatus: {
            not: 'PAID',
          },
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
          paymentStatus: {
            not: 'PAID',
          },
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
      'Sheet ID': dbRecord.sheetId || '',
      'Borrower ID': dbRecord.borrowerId || '',
      'School ID': dbRecord.schoolId || '',
      'Loan ID': dbRecord.loanId || '',
      'Credit Application ID': dbRecord.creditApplicationId || '',
      'Payment Schedule Number': dbRecord.paymentScheduleNumber || '',
      'Installment Number': dbRecord.installmentNumber || '',
      'Due Date': dbRecord.dueDate || '',
      'Amount Due': dbRecord.amountDue || '',
      'Principal Amount': dbRecord.principalAmount || '',
      'Interest Amount': dbRecord.interestAmount || '',
      'Fees Amount': dbRecord.feesAmount || '',
      'Penalty Amount': dbRecord.penaltyAmount || '',
      'Total Amount': dbRecord.totalAmount || '',
      'Payment Status': dbRecord.paymentStatus || '',
      'Payment Method': dbRecord.paymentMethod || '',
      'Payment Date': dbRecord.paymentDate || '',
      'Amount Paid': dbRecord.amountPaid || '',
      'Balance Carried Forward': dbRecord.balanceCarriedForward || '',
      Remarks: dbRecord.remarks || '',
      'Created At': dbRecord.createdAt || '',
      Synced: dbRecord.synced || false,
    };
  }

  // Convert sheet record to database format
  convertSheetToDb(sheetRecord: any) {
    return {
      sheetId: sheetRecord['Sheet ID'] || null,
      borrowerId: sheetRecord['Borrower ID'] || null,
      schoolId: sheetRecord['School ID'] || null,
      loanId: sheetRecord['Loan ID'] || null,
      creditApplicationId: sheetRecord['Credit Application ID'] || null,
      paymentScheduleNumber: sheetRecord['Payment Schedule Number'] || null,
      installmentNumber: sheetRecord['Installment Number'] || null,
      dueDate: sheetRecord['Due Date'] || null,
      amountDue: sheetRecord['Amount Due'] || null,
      principalAmount: sheetRecord['Principal Amount'] || null,
      interestAmount: sheetRecord['Interest Amount'] || null,
      feesAmount: sheetRecord['Fees Amount'] || null,
      penaltyAmount: sheetRecord['Penalty Amount'] || null,
      totalAmount: sheetRecord['Total Amount'] || null,
      paymentStatus: sheetRecord['Payment Status'] || null,
      paymentMethod: sheetRecord['Payment Method'] || null,
      paymentDate: sheetRecord['Payment Date'] || null,
      amountPaid: sheetRecord['Amount Paid'] || null,
      balanceCarriedForward: sheetRecord['Balance Carried Forward'] || null,
      remarks: sheetRecord['Remarks'] || null,
    };
  }

  // Convert database array to sheet format
  convertDbArrayToSheet(dbRecords: any[]) {
    return dbRecords.map((record) => this.convertDbToSheet(record));
  }
}
