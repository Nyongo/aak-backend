import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OtherSupportingDocsDbService {
  private readonly logger = new Logger(OtherSupportingDocsDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'Document Type': 'documentType',
    Notes: 'notes',
    File: 'file',
    Image: 'image',
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
   * Find all other supporting docs
   */
  async findAll() {
    return this.prisma.otherSupportingDoc.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find other supporting docs by credit application ID
   */
  async findByCreditApplicationId(creditApplicationId: string) {
    return this.prisma.otherSupportingDoc.findMany({
      where: { creditApplicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find unsynced other supporting docs
   */
  async findUnsynced() {
    return this.prisma.otherSupportingDoc.findMany({
      where: { synced: false },
    });
  }

  /**
   * Find synced other supporting docs
   */
  async findSynced() {
    return this.prisma.otherSupportingDoc.findMany({
      where: { synced: true },
    });
  }

  /**
   * Find other supporting doc by ID
   */
  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.otherSupportingDoc.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, try to find by sheetId or creditApplicationId
    return this.prisma.otherSupportingDoc.findFirst({
      where: {
        OR: [{ sheetId: id }, { creditApplicationId: id }],
      },
    });
  }

  /**
   * Find other supporting doc by sheet ID
   */
  async findBySheetId(sheetId: string) {
    return this.prisma.otherSupportingDoc.findFirst({
      where: { sheetId },
    });
  }

  /**
   * Create a new other supporting doc record
   */
  async create(data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Creating other supporting doc with data:', {
      creditApplicationId: data.creditApplicationId,
      documentType: data.documentType,
      allConvertedData: convertedData,
    });
    return this.prisma.otherSupportingDoc.create({ data: convertedData });
  }

  /**
   * Update other supporting doc by sheetId
   * Note: We always use sheetId for updates since the controller uses findBySheetId
   */
  async update(sheetId: string, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating other supporting doc with data:', {
      sheetId,
      creditApplicationId: data.creditApplicationId,
      documentType: data.documentType,
      allConvertedData: convertedData,
    });

    // Find the record by sheetId to get the numeric database ID
    const otherSupportingDoc = await this.findBySheetId(sheetId);
    if (!otherSupportingDoc) {
      throw new Error(`Other supporting doc with sheetId ${sheetId} not found`);
    }

    return this.prisma.otherSupportingDoc.update({
      where: { id: otherSupportingDoc.id },
      data: convertedData,
    });
  }

  /**
   * Update other supporting doc by database ID
   */
  async updateById(id: number, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating other supporting doc by ID with data:', {
      id,
      creditApplicationId: data.creditApplicationId,
      documentType: data.documentType,
      allConvertedData: convertedData,
    });

    return this.prisma.otherSupportingDoc.update({
      where: { id },
      data: convertedData,
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.otherSupportingDoc.update({
      where: { id },
      data: { synced },
    });
  }

  /**
   * Delete other supporting doc by ID
   */
  async delete(id: string) {
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.otherSupportingDoc.delete({
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
      } else if (key === 'Document Type' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Notes' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'File' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Image' && typeof value === 'string') {
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
