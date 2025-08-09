import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReferrersDbService {
  private readonly logger = new Logger(ReferrersDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    ID: 'sheetId',
    'School ID': 'schoolId',
    'Referrer Name': 'referrerName',
    'M Pesa Number': 'mpesaNumber',
    'Referral Reward Paid?': 'referralRewardPaid',
    'Date Paid': 'datePaid',
    'Amount Paid': 'amountPaid',
    'Proof of Payment': 'proofOfPayment',
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
   * Find all referrers
   */
  async findAll() {
    return this.prisma.referrer.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find referrers by school ID
   */
  async findBySchoolId(schoolId: string) {
    return this.prisma.referrer.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find unsynced referrers
   */
  async findUnsynced() {
    return this.prisma.referrer.findMany({
      where: { synced: false },
    });
  }

  /**
   * Find synced referrers
   */
  async findSynced() {
    return this.prisma.referrer.findMany({
      where: { synced: true },
    });
  }

  /**
   * Find referrer by ID
   */
  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.referrer.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, check for sheetId or schoolId
    return this.prisma.referrer.findFirst({
      where: {
        OR: [{ sheetId: id }, { schoolId: id }],
      },
    });
  }

  /**
   * Find referrer by sheet ID
   */
  async findBySheetId(sheetId: string) {
    return this.prisma.referrer.findFirst({
      where: { sheetId },
    });
  }

  /**
   * Create a new referrer record
   */
  async create(data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Creating referrer with data:', {
      schoolId: data.schoolId,
      referrerName: data.referrerName,
      allConvertedData: convertedData,
    });
    return this.prisma.referrer.create({ data: convertedData });
  }

  /**
   * Update referrer by sheetId
   * Note: We always use sheetId for updates since the controller uses findBySheetId
   */
  async update(sheetId: string, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating referrer with data:', {
      sheetId,
      schoolId: data.schoolId,
      referrerName: data.referrerName,
      allConvertedData: convertedData,
    });

    // Find the record by sheetId to get the numeric database ID
    const referrer = await this.findBySheetId(sheetId);
    if (!referrer) {
      throw new Error(`Referrer with sheetId ${sheetId} not found`);
    }

    return this.prisma.referrer.update({
      where: { id: referrer.id },
      data: convertedData,
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.referrer.update({
      where: { id },
      data: { synced },
    });
  }

  /**
   * Delete referrer
   */
  async delete(id: string) {
    return this.prisma.referrer.delete({
      where: { id: parseInt(id) },
    });
  }

  /**
   * Convert data types for database storage
   */
  private convertDataTypes(data: any) {
    const stringFields = [
      'sheetId',
      'schoolId',
      'referrerName',
      'mpesaNumber',
      'referralRewardPaid',
      'datePaid',
      'amountPaid',
      'proofOfPayment',
    ];

    const convertedData = { ...data };

    // Convert string fields
    stringFields.forEach((field) => {
      if (convertedData[field] !== undefined) {
        convertedData[field] = convertedData[field]?.toString() || null;
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
