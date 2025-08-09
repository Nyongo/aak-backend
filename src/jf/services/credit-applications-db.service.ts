import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CreditApplicationsDbService {
  private readonly logger = new Logger(CreditApplicationsDbService.name);
  private readonly numberFields = [
    'totalAmountRequested',
    'currentCostOfCapital',
    'checksCollected',
    'checksNeededForLoan',
  ];

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    ID: 'sheetId',
    'Customer Type': 'customerType',
    'Borrower ID': 'borrowerId',
    'Application Start Date': 'applicationStartDate',
    'Credit Type': 'creditType',
    'Total Amount Requested': 'totalAmountRequested',
    'Working Capital Application Number': 'workingCapitalApplicationNumber',
    'SSL Action Needed': 'sslActionNeeded',
    'SSL Action': 'sslAction',
    'SSL ID': 'sslId',
    'SSL Feedback on Action': 'sslFeedbackOnAction',
    'School CRB Available?': 'schoolCrbAvailable',
    Status: 'status',
    'Referred By': 'referredBy',
    'Current Cost of Capital': 'currentCostOfCapital',
    'Checks Collected': 'checksCollected',
    'Checks Needed for Loan': 'checksNeededForLoan',
    'Photo of Check': 'photoOfCheck',
    'Comments on Checks': 'commentsOnChecks',
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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all credit applications
   */
  async findAll() {
    return this.prisma.creditApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find credit applications by borrower ID
   */
  async findByBorrowerId(borrowerId: string) {
    return this.prisma.creditApplication.findMany({
      where: { borrowerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find unsynced credit applications
   */
  async findUnsynced() {
    return this.prisma.creditApplication.findMany({
      where: { synced: false },
    });
  }

  /**
   * Find synced credit applications
   */
  async findSynced() {
    return this.prisma.creditApplication.findMany({
      where: { synced: true },
    });
  }

  /**
   * Find credit application by ID
   */
  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.creditApplication.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, check for sheetId or borrowerId
    return this.prisma.creditApplication.findFirst({
      where: {
        OR: [{ sheetId: id }, { borrowerId: id }],
      },
    });
  }

  /**
   * Find credit application by sheet ID
   */
  async findBySheetId(sheetId: string) {
    return this.prisma.creditApplication.findFirst({
      where: { sheetId },
    });
  }

  /**
   * Create a new credit application record
   */
  async create(data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Creating credit application with data:', {
      borrowerId: data.borrowerId,
      creditType: data.creditType,
      allConvertedData: convertedData,
    });
    return this.prisma.creditApplication.create({ data: convertedData });
  }

  /**
   * Update credit application by sheetId
   * Note: We always use sheetId for updates since the controller uses findBySheetId
   */
  async update(sheetId: string, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating credit application with data:', {
      sheetId,
      borrowerId: data.borrowerId,
      creditType: data.creditType,
      allConvertedData: convertedData,
    });

    // Find the record by sheetId to get the numeric database ID
    const creditApplication = await this.findBySheetId(sheetId);
    if (!creditApplication) {
      throw new Error(`Credit application with sheetId ${sheetId} not found`);
    }

    return this.prisma.creditApplication.update({
      where: { id: creditApplication.id },
      data: convertedData,
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.creditApplication.update({
      where: { id },
      data: { synced },
    });
  }

  /**
   * Delete credit application
   */
  async delete(id: string) {
    return this.prisma.creditApplication.delete({
      where: { id: parseInt(id) },
    });
  }

  /**
   * Convert data types for database storage
   */
  private convertDataTypes(data: any) {
    const stringFields = [
      'sheetId',
      'customerType',
      'borrowerId',
      'creditType',
      'workingCapitalApplicationNumber',
      'sslActionNeeded',
      'sslAction',
      'sslId',
      'sslFeedbackOnAction',
      'schoolCrbAvailable',
      'referredBy',
      'photoOfCheck',
      'status',
      'commentsOnChecks',
    ];

    const dateFields = ['applicationStartDate', 'createdAt'];

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
