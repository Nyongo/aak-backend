import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActiveDebtsDbService {
  private readonly logger = new Logger(ActiveDebtsDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'Debt Status': 'debtStatus',
    'Listed on CRB?': 'listedOnCrb',
    'Personal Loan or School Loan': 'personalLoanOrSchoolLoan',
    Lender: 'lender',
    'Date Loan Taken': 'dateLoanTaken',
    'Final Due Date': 'finalDueDate',
    'Total Loan Amount': 'totalLoanAmount',
    Balance: 'balance',
    'Amount Overdue': 'amountOverdue',
    'Monthly Payment': 'monthlyPayment',
    'Debt Statement': 'debtStatement',
    'Annual Declining Balance Interest Rate':
      'annualDecliningBalanceInterestRate',
    'Is the loan collateralized? ': 'isLoanCollateralized',
    'Type of collateral ': 'typeOfCollateral',
    'What was the loan used for': 'whatWasLoanUsedFor',
    'Created At': 'createdAt',
  };

  private readonly dbToSheetMapping = Object.fromEntries(
    Object.entries(this.sheetToDbMapping).map(([sheet, db]) => [db, sheet]),
  );

  // Add synced field mapping for responses
  private readonly dbToSheetMappingWithSync = {
    ...this.dbToSheetMapping,
    synced: 'Synced',
  };

  // Number fields that need special handling
  private readonly numberFields = [
    'totalLoanAmount',
    'balance',
    'amountOverdue',
    'monthlyPayment',
    'annualDecliningBalanceInterestRate',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all active debts
   */
  async findAll() {
    return this.prisma.activeDebt.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find active debts by credit application ID
   */
  async findByCreditApplicationId(creditApplicationId: string) {
    return this.prisma.activeDebt.findMany({
      where: { creditApplicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find unsynced active debts
   */
  async findUnsynced() {
    return this.prisma.activeDebt.findMany({
      where: { synced: false },
    });
  }

  /**
   * Find synced active debts
   */
  async findSynced() {
    return this.prisma.activeDebt.findMany({
      where: { synced: true },
    });
  }

  /**
   * Find active debt by ID
   */
  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.activeDebt.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, check for sheetId or creditApplicationId
    return this.prisma.activeDebt.findFirst({
      where: {
        OR: [{ sheetId: id }, { creditApplicationId: id }],
      },
    });
  }

  /**
   * Find active debt by sheet ID
   */
  async findBySheetId(sheetId: string) {
    return this.prisma.activeDebt.findFirst({
      where: { sheetId },
    });
  }

  /**
   * Create a new active debt record
   */
  async create(data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Creating active debt with data:', {
      creditApplicationId: data.creditApplicationId,
      debtStatus: data.debtStatus,
      allConvertedData: convertedData,
    });
    return this.prisma.activeDebt.create({ data: convertedData });
  }

  /**
   * Update active debt by sheetId
   * Note: We always use sheetId for updates since the controller uses findBySheetId
   */
  async update(sheetId: string, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating active debt with data:', {
      sheetId,
      creditApplicationId: data.creditApplicationId,
      debtStatus: data.debtStatus,
      allConvertedData: convertedData,
    });

    // Find the record by sheetId to get the numeric database ID
    const activeDebt = await this.findBySheetId(sheetId);
    if (!activeDebt) {
      throw new Error(`Active debt with sheetId ${sheetId} not found`);
    }

    return this.prisma.activeDebt.update({
      where: { id: activeDebt.id },
      data: convertedData,
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.activeDebt.update({
      where: { id },
      data: { synced },
    });
  }

  /**
   * Delete active debt
   */
  async delete(id: string) {
    return this.prisma.activeDebt.delete({
      where: { id: parseInt(id) },
    });
  }

  /**
   * Convert data types for database storage
   */
  private convertDataTypes(data: any) {
    const stringFields = [
      'sheetId',
      'creditApplicationId',
      'debtStatus',
      'listedOnCrb',
      'personalLoanOrSchoolLoan',
      'lender',
      'dateLoanTaken',
      'finalDueDate',
      'debtStatement',
      'isLoanCollateralized',
      'typeOfCollateral',
      'whatWasLoanUsedFor',
    ];

    const dateFields = ['createdAt'];

    const convertedData = { ...data };

    // Convert string fields
    stringFields.forEach((field) => {
      if (convertedData[field] !== undefined) {
        convertedData[field] = convertedData[field]?.toString() || null;
      }
    });

    // Convert number fields
    this.numberFields.forEach((field) => {
      if (convertedData[field] !== undefined) {
        const numValue = Number(convertedData[field]);
        convertedData[field] = isNaN(numValue) ? 0 : numValue;
      }
    });

    // Convert date fields
    dateFields.forEach((field) => {
      if (convertedData[field] !== undefined) {
        try {
          const dateValue = new Date(convertedData[field]);
          convertedData[field] = isNaN(dateValue.getTime())
            ? new Date().toISOString()
            : dateValue.toISOString();
        } catch (error) {
          convertedData[field] = new Date().toISOString();
        }
      }
    });

    // Convert boolean fields
    if (convertedData.synced !== undefined) {
      convertedData.synced = Boolean(convertedData.synced);
    }

    return convertedData;
  }

  /**
   * Convert database record to sheet format
   */
  convertDbToSheet(dbRecord: any) {
    const sheetData: any = {};

    for (const [dbKey, sheetKey] of Object.entries(
      this.dbToSheetMappingWithSync,
    )) {
      if (dbRecord[dbKey] !== undefined) {
        if (dbKey === 'createdAt' && dbRecord[dbKey]) {
          sheetData[sheetKey] = dbRecord[dbKey].toISOString();
        } else if (
          this.numberFields.includes(dbKey) &&
          dbRecord[dbKey] !== null
        ) {
          // Convert numbers to strings for Google Sheets
          sheetData[sheetKey] = dbRecord[dbKey].toString();
        } else {
          sheetData[sheetKey] = dbRecord[dbKey] || '';
        }
      }
    }

    this.logger.debug(`Converting DB record to sheet format:`, {
      originalRecord: dbRecord,
      convertedRecord: sheetData,
    });

    return sheetData;
  }

  /**
   * Convert database array to sheet format
   */
  convertDbArrayToSheet(dbRecords: any[]) {
    return dbRecords.map((record) => this.convertDbToSheet(record));
  }

  /**
   * Convert sheet data to database format
   */
  convertSheetToDb(sheetRecord: any) {
    const dbData: any = {};

    for (const [sheetKey, dbKey] of Object.entries(this.sheetToDbMapping)) {
      if (sheetRecord[sheetKey] !== undefined) {
        dbData[dbKey] = sheetRecord[sheetKey] || null;
      }
    }

    // Always set synced to true for sheet data
    dbData.synced = true;

    return dbData;
  }
}
