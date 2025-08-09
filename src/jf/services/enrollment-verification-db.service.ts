import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EnrollmentVerificationDbService {
  private readonly logger = new Logger(EnrollmentVerificationDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'Sub County Enrollment Report': 'subCountyEnrollmentReport',
    'Enrollment Report': 'enrollmentReport',
    'Number of Students This Year': 'numberOfStudentsThisYear',
    'Number of students last year': 'numberOfStudentsLastYear',
    'Number of students two years ago': 'numberOfStudentsTwoYearsAgo',
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
   * Find all enrollment verifications
   */
  async findAll() {
    return this.prisma.enrollmentVerification.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find enrollment verifications by credit application ID
   */
  async findByCreditApplicationId(creditApplicationId: string) {
    return this.prisma.enrollmentVerification.findMany({
      where: { creditApplicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find unsynced enrollment verifications
   */
  async findUnsynced() {
    return this.prisma.enrollmentVerification.findMany({
      where: { synced: false },
    });
  }

  /**
   * Find synced enrollment verifications
   */
  async findSynced() {
    return this.prisma.enrollmentVerification.findMany({
      where: { synced: true },
    });
  }

  /**
   * Find enrollment verification by ID
   */
  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.enrollmentVerification.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, try to find by sheetId or creditApplicationId
    return this.prisma.enrollmentVerification.findFirst({
      where: {
        OR: [{ sheetId: id }, { creditApplicationId: id }],
      },
    });
  }

  /**
   * Find enrollment verification by sheet ID
   */
  async findBySheetId(sheetId: string) {
    return this.prisma.enrollmentVerification.findFirst({
      where: { sheetId },
    });
  }

  /**
   * Create a new enrollment verification record
   */
  async create(data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Creating enrollment verification with data:', {
      creditApplicationId: data.creditApplicationId,
      numberOfStudentsThisYear: data.numberOfStudentsThisYear,
      allConvertedData: convertedData,
    });
    return this.prisma.enrollmentVerification.create({ data: convertedData });
  }

  /**
   * Update enrollment verification by sheetId
   * Note: We always use sheetId for updates since the controller uses findBySheetId
   */
  async update(sheetId: string, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating enrollment verification with data:', {
      sheetId,
      creditApplicationId: data.creditApplicationId,
      numberOfStudentsThisYear: data.numberOfStudentsThisYear,
      allConvertedData: convertedData,
    });

    // Find the record by sheetId to get the numeric database ID
    const enrollmentVerification = await this.findBySheetId(sheetId);
    if (!enrollmentVerification) {
      throw new Error(
        `Enrollment verification with sheetId ${sheetId} not found`,
      );
    }

    return this.prisma.enrollmentVerification.update({
      where: { id: enrollmentVerification.id },
      data: convertedData,
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.enrollmentVerification.update({
      where: { id },
      data: { synced },
    });
  }

  /**
   * Delete enrollment verification by ID
   */
  async delete(id: string) {
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.enrollmentVerification.delete({
        where: { id: numericId },
      });
    }
    throw new Error('Invalid ID format');
  }

  /**
   * Convert data types for database storage
   */
  private convertDataTypes(data: any) {
    const convertedData = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Map sheet field names to database field names
      const dbFieldName = this.sheetToDbMapping[key] || key;

      // Handle special cases
      if (key === 'ID' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Credit Application ID' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (
        key === 'Sub County Enrollment Report' &&
        typeof value === 'string'
      ) {
        convertedData[dbFieldName] = value;
      } else if (key === 'Enrollment Report' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (
        key === 'Number of Students This Year' &&
        typeof value === 'number'
      ) {
        convertedData[dbFieldName] = value;
      } else if (
        key === 'Number of students last year' &&
        typeof value === 'number'
      ) {
        convertedData[dbFieldName] = value;
      } else if (
        key === 'Number of students two years ago' &&
        typeof value === 'number'
      ) {
        convertedData[dbFieldName] = value;
      } else if (key === 'Created At' && typeof value === 'string') {
        convertedData[dbFieldName] = new Date(value);
      } else {
        convertedData[dbFieldName] = value;
      }
    }

    return convertedData;
  }

  /**
   * Convert database record to sheet format
   */
  convertDbToSheet(dbRecord: any) {
    const sheetRecord = {};

    for (const [dbField, value] of Object.entries(dbRecord)) {
      const sheetField = this.dbToSheetMappingWithSync[dbField] || dbField;
      sheetRecord[sheetField] = value;
    }

    return sheetRecord;
  }

  /**
   * Convert array of database records to sheet format
   */
  convertDbArrayToSheet(dbRecords: any[]) {
    return dbRecords.map((record) => this.convertDbToSheet(record));
  }

  /**
   * Convert sheet record to database format
   */
  convertSheetToDb(sheetRecord: any) {
    const dbRecord = {};

    for (const [sheetField, value] of Object.entries(sheetRecord)) {
      const dbField = this.sheetToDbMapping[sheetField] || sheetField;
      dbRecord[dbField] = value;
    }

    return dbRecord;
  }
}
