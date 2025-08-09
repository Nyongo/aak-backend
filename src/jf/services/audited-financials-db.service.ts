import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditedFinancialsDbService {
  private readonly logger = new Logger(AuditedFinancialsDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'Statement Type': 'statementType',
    Notes: 'notes',
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
   * Find all audited financials
   */
  async findAll() {
    return this.prisma.auditedFinancial.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find audited financials by credit application ID
   */
  async findByCreditApplicationId(creditApplicationId: string) {
    return this.prisma.auditedFinancial.findMany({
      where: { creditApplicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find unsynced audited financials
   */
  async findUnsynced() {
    return this.prisma.auditedFinancial.findMany({
      where: { synced: false },
    });
  }

  /**
   * Find synced audited financials
   */
  async findSynced() {
    return this.prisma.auditedFinancial.findMany({
      where: { synced: true },
    });
  }

  /**
   * Find audited financial by ID
   */
  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.auditedFinancial.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, try to find by sheetId or creditApplicationId
    return this.prisma.auditedFinancial.findFirst({
      where: {
        OR: [{ sheetId: id }, { creditApplicationId: id }],
      },
    });
  }

  /**
   * Find audited financial by sheet ID
   */
  async findBySheetId(sheetId: string) {
    return this.prisma.auditedFinancial.findFirst({
      where: { sheetId },
    });
  }

  /**
   * Create a new audited financial record
   */
  async create(data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Creating audited financial with data:', {
      creditApplicationId: data.creditApplicationId,
      statementType: data.statementType,
      allConvertedData: convertedData,
    });
    return this.prisma.auditedFinancial.create({ data: convertedData });
  }

  /**
   * Update audited financial by sheetId
   * Note: We always use sheetId for updates since the controller uses findBySheetId
   */
  async update(sheetId: string, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating audited financial with data:', {
      sheetId,
      creditApplicationId: data.creditApplicationId,
      statementType: data.statementType,
      allConvertedData: convertedData,
    });

    // Find the record by sheetId to get the numeric database ID
    const auditedFinancial = await this.findBySheetId(sheetId);
    if (!auditedFinancial) {
      throw new Error(`Audited financial with sheetId ${sheetId} not found`);
    }

    return this.prisma.auditedFinancial.update({
      where: { id: auditedFinancial.id },
      data: convertedData,
    });
  }

  /**
   * Update audited financial by database ID
   */
  async updateById(id: number, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating audited financial by ID with data:', {
      id,
      creditApplicationId: data.creditApplicationId,
      statementType: data.statementType,
      allConvertedData: convertedData,
    });

    return this.prisma.auditedFinancial.update({
      where: { id },
      data: convertedData,
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.auditedFinancial.update({
      where: { id },
      data: { synced },
    });
  }

  /**
   * Delete audited financial by ID
   */
  async delete(id: string) {
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.auditedFinancial.delete({
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
      } else if (key === 'Statement Type' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Notes' && typeof value === 'string') {
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
