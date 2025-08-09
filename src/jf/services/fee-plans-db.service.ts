import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeePlansDbService {
  private readonly logger = new Logger(FeePlansDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'School Year': 'schoolYear',
    Photo: 'photo',
    File: 'file',
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
   * Find all fee plans
   */
  async findAll() {
    return this.prisma.feePlan.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find fee plans by credit application ID
   */
  async findByCreditApplicationId(creditApplicationId: string) {
    return this.prisma.feePlan.findMany({
      where: { creditApplicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find unsynced fee plans
   */
  async findUnsynced() {
    return this.prisma.feePlan.findMany({
      where: { synced: false },
    });
  }

  /**
   * Find synced fee plans
   */
  async findSynced() {
    return this.prisma.feePlan.findMany({
      where: { synced: true },
    });
  }

  /**
   * Find fee plan by ID
   */
  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.feePlan.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, try to find by sheetId or creditApplicationId
    return this.prisma.feePlan.findFirst({
      where: {
        OR: [{ sheetId: id }, { creditApplicationId: id }],
      },
    });
  }

  /**
   * Find fee plan by sheet ID
   */
  async findBySheetId(sheetId: string) {
    return this.prisma.feePlan.findFirst({
      where: { sheetId },
    });
  }

  /**
   * Create a new fee plan record
   */
  async create(data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Creating fee plan with data:', {
      creditApplicationId: data.creditApplicationId,
      schoolYear: data.schoolYear,
      allConvertedData: convertedData,
    });
    return this.prisma.feePlan.create({ data: convertedData });
  }

  /**
   * Update fee plan by sheetId
   * Note: We always use sheetId for updates since the controller uses findBySheetId
   */
  async update(sheetId: string, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating fee plan with data:', {
      sheetId,
      creditApplicationId: data.creditApplicationId,
      schoolYear: data.schoolYear,
      allConvertedData: convertedData,
    });

    // Find the record by sheetId to get the numeric database ID
    const feePlan = await this.findBySheetId(sheetId);
    if (!feePlan) {
      throw new Error(`Fee plan with sheetId ${sheetId} not found`);
    }

    return this.prisma.feePlan.update({
      where: { id: feePlan.id },
      data: convertedData,
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.feePlan.update({
      where: { id },
      data: { synced },
    });
  }

  /**
   * Delete fee plan by ID
   */
  async delete(id: string) {
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.feePlan.delete({
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
      } else if (key === 'School Year' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Photo' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'File' && typeof value === 'string') {
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
