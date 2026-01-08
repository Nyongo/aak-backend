import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDirectLendingProcessingDto } from '../dto/create-direct-lending-processing.dto';
import { UpdateDirectLendingProcessingDto } from '../dto/update-direct-lending-processing.dto';

@Injectable()
export class DirectLendingProcessingDbService {
  private readonly logger = new Logger(
    DirectLendingProcessingDbService.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDirectLendingProcessingDto: CreateDirectLendingProcessingDto,
  ) {
    try {
      const result = await this.prisma.directLendingProcessing.create({
        data: createDirectLendingProcessingDto,
      });
      this.logger.log(
        `Created direct lending processing with ID: ${result.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error('Error creating direct lending processing:', error);
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.prisma.directLendingProcessing.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        'Error fetching all direct lending processing records:',
        error,
      );
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      return await this.prisma.directLendingProcessing.findUnique({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct lending processing with ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.directLendingProcessing.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct lending processing with sheet ID ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async findByDirectLoanId(directLoanId: string) {
    try {
      return await this.prisma.directLendingProcessing.findMany({
        where: { directLoanId },
        orderBy: { paymentDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct lending processing for direct loan ${directLoanId}:`,
        error,
      );
      throw error;
    }
  }

  async findByBorrowerId(borrowerId: string) {
    try {
      return await this.prisma.directLendingProcessing.findMany({
        where: { borrowerId },
        orderBy: { paymentDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct lending processing for borrower ${borrowerId}:`,
        error,
      );
      throw error;
    }
  }

  async findByPaymentScheduleId(paymentScheduleId: string) {
    try {
      return await this.prisma.directLendingProcessing.findMany({
        where: { paymentScheduleId },
        orderBy: { paymentDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct lending processing for payment schedule ${paymentScheduleId}:`,
        error,
      );
      throw error;
    }
  }

  async findBySslId(sslId: string) {
    try {
      return await this.prisma.directLendingProcessing.findMany({
        where: { sslId },
        orderBy: { paymentDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct lending processing for SSL ID ${sslId}:`,
        error,
      );
      throw error;
    }
  }

  async findByRegion(region: string) {
    try {
      return await this.prisma.directLendingProcessing.findMany({
        where: { region },
        orderBy: { paymentDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct lending processing for region ${region}:`,
        error,
      );
      throw error;
    }
  }

  async findByPaymentType(paymentType: string) {
    try {
      return await this.prisma.directLendingProcessing.findMany({
        where: { paymentType },
        orderBy: { paymentDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct lending processing for payment type ${paymentType}:`,
        error,
      );
      throw error;
    }
  }

  async findByPaymentSource(paymentSource: string) {
    try {
      return await this.prisma.directLendingProcessing.findMany({
        where: { paymentSource },
        orderBy: { paymentDate: 'asc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching direct lending processing for payment source ${paymentSource}:`,
        error,
      );
      throw error;
    }
  }

  async update(
    id: number,
    updateDirectLendingProcessingDto: UpdateDirectLendingProcessingDto,
  ) {
    try {
      const result = await this.prisma.directLendingProcessing.update({
        where: { id },
        data: updateDirectLendingProcessingDto,
      });
      this.logger.log(
        `Updated direct lending processing with ID: ${id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error updating direct lending processing with ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  async remove(id: number) {
    try {
      const result = await this.prisma.directLendingProcessing.delete({
        where: { id },
      });
      this.logger.log(
        `Deleted direct lending processing with ID: ${id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error deleting direct lending processing with ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  // Helper method to safely get a value from sheet record, handling multiple column name variations
  private getSheetValue(
    sheetRecord: any,
    ...possibleKeys: string[]
  ): string | null {
    for (const key of possibleKeys) {
      const value = sheetRecord[key];
      if (value !== undefined && value !== null && value !== '') {
        // Convert to string and trim
        const stringValue = String(value).trim();
        if (stringValue !== '') {
          return stringValue;
        }
      }
    }
    return null;
  }

  convertSheetToDb(sheetRecord: any): CreateDirectLendingProcessingDto {
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

    // Map the actual column names from the sheet to database fields
    // Based on actual columns from the sheet
    const dbRecord: CreateDirectLendingProcessingDto = {
      // ID field - exact column name from sheet
      sheetId: this.getSheetValue(
        sheetRecord,
        'ID',
        'Sheet ID',
        'sheetId',
        'Id',
        'id',
      ),

      // Payment information
      paymentType: this.getSheetValue(
        sheetRecord,
        'Payment Type',
        'paymentType',
        'payment_type',
      ),

      paymentSource: this.getSheetValue(
        sheetRecord,
        'Payment Source',
        'paymentSource',
        'payment_source',
      ),

      // Borrower information
      borrowerType: this.getSheetValue(
        sheetRecord,
        'Borrower Type',
        'borrowerType',
        'Borrower Type ',
        'borrower_type',
      ),

      borrowerId: this.getSheetValue(
        sheetRecord,
        'Borrower ID',
        'borrowerId',
        'borrower_id',
      ),

      // Loan and schedule information
      directLoanId: this.getSheetValue(
        sheetRecord,
        'Direct Loan ID',
        'directLoanId',
        'direct_loan_id',
      ),

      paymentScheduleId: this.getSheetValue(
        sheetRecord,
        'Payment Schedule ID',
        'paymentScheduleId',
        'payment_schedule_id',
      ),

      // Payment details
      paymentDate: this.getSheetValue(
        sheetRecord,
        'Payment Date',
        'paymentDate',
        'payment_date',
      ),

      amountPaid: this.getSheetValue(
        sheetRecord,
        'Amount Paid',
        'amountPaid',
        'amount_paid',
      ),

      paymentReferenceOrTransactionCode: this.getSheetValue(
        sheetRecord,
        'Payment Reference or Transaction Code',
        'paymentReferenceOrTransactionCode',
        'Payment Reference or Transaction Code',
        'payment_reference_or_transaction_code',
        'Transaction Code',
      ),

      // Installment amounts
      installmentPaymentAmount: this.getSheetValue(
        sheetRecord,
        'Installment Payment Amount',
        'installmentPaymentAmount',
        'installment_payment_amount',
      ),

      installmentVehicleInsurancePremiumAmount: this.getSheetValue(
        sheetRecord,
        'Installment Vehicle Insurance Premium Amount',
        'installmentVehicleInsurancePremiumAmount',
        'installment_vehicle_insurance_premium_amount',
      ),

      installmentVehicleInsuranceSurchargeAmount: this.getSheetValue(
        sheetRecord,
        'Installment Vehicle Insurance Surcharge Amount',
        'installmentVehicleInsuranceSurchargeAmount',
        'installment_vehicle_insurance_surcharge_amount',
      ),

      installmentInterestAmount: this.getSheetValue(
        sheetRecord,
        'Installment Interest Amount',
        'installmentInterestAmount',
        'installment_interest_amount',
      ),

      installmentPrincipalAmount: this.getSheetValue(
        sheetRecord,
        'Installment Principal Amount',
        'installmentPrincipalAmount',
        'installment_principal_amount',
      ),

      // Actual amounts paid
      vehicleInsurancePremiumPaid: this.getSheetValue(
        sheetRecord,
        'Vehicle Insurance Premium Paid',
        'vehicleInsurancePremiumPaid',
        'vehicle_insurance_premium_paid',
      ),

      vehicleInsuranceSurchargePaid: this.getSheetValue(
        sheetRecord,
        'Vehicle Insurance Surcharge Paid',
        'vehicleInsuranceSurchargePaid',
        'vehicle_insurance_surcharge_paid',
      ),

      interestPaid: this.getSheetValue(
        sheetRecord,
        'Interest Paid',
        'interestPaid',
        'interest_paid',
      ),

      principalPaid: this.getSheetValue(
        sheetRecord,
        'Principal Paid',
        'principalPaid',
        'principal_paid',
      ),

      // Additional fields
      createdBy: this.getSheetValue(
        sheetRecord,
        'Created By',
        'createdBy',
        'created_by',
      ),

      sslId: this.getSheetValue(
        sheetRecord,
        'SSL ID',
        'sslId',
        'Ssl ID',
        'ssl_id',
      ),

      region: this.getSheetValue(
        sheetRecord,
        'Region',
        'region',
        'Area',
      ),
    };

    // Remove null/undefined values to keep the record clean
    Object.keys(dbRecord).forEach((key) => {
      if (dbRecord[key] === null || dbRecord[key] === undefined) {
        delete dbRecord[key];
      }
    });

    return dbRecord;
  }
}
