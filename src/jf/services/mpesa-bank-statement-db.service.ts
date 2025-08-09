import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MpesaBankStatementDbService {
  private readonly logger = new Logger(MpesaBankStatementDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application': 'creditApplicationId',
    'Personal Or Business Account': 'personalOrBusinessAccount',
    Type: 'type',
    'Account Details': 'accountDetails',
    Description: 'description',
    Statement: 'statement',
    'Statement Start Date': 'statementStartDate',
    'Statement End Date': 'statementEndDate',
    'Total Revenue': 'totalRevenue',
    'Converted Excel File': 'convertedExcelFile',
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
   * Find all mpesa bank statements
   */
  async findAll() {
    return this.prisma.mpesaBankStatement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find mpesa bank statements by credit application ID
   */
  async findByCreditApplicationId(creditApplicationId: string) {
    return this.prisma.mpesaBankStatement.findMany({
      where: { creditApplicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find unsynced mpesa bank statements
   */
  async findUnsynced() {
    return this.prisma.mpesaBankStatement.findMany({
      where: { synced: false },
    });
  }

  /**
   * Find synced mpesa bank statements
   */
  async findSynced() {
    return this.prisma.mpesaBankStatement.findMany({
      where: { synced: true },
    });
  }

  /**
   * Find mpesa bank statement by ID
   */
  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.mpesaBankStatement.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, try to find by sheetId or creditApplicationId
    return this.prisma.mpesaBankStatement.findFirst({
      where: {
        OR: [{ sheetId: id }, { creditApplicationId: id }],
      },
    });
  }

  /**
   * Find mpesa bank statement by sheet ID
   */
  async findBySheetId(sheetId: string) {
    return this.prisma.mpesaBankStatement.findFirst({
      where: { sheetId },
    });
  }

  /**
   * Create a new mpesa bank statement record
   */
  async create(data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Creating mpesa bank statement with data:', {
      creditApplicationId: data.creditApplicationId,
      type: data.type,
      allConvertedData: convertedData,
    });
    return this.prisma.mpesaBankStatement.create({ data: convertedData });
  }

  /**
   * Update mpesa bank statement by sheetId
   * Note: We always use sheetId for updates since the controller uses findBySheetId
   */
  async update(sheetId: string, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating mpesa bank statement with data:', {
      sheetId,
      creditApplicationId: data.creditApplicationId,
      type: data.type,
      allConvertedData: convertedData,
    });

    // Find the record by sheetId to get the numeric database ID
    const mpesaBankStatement = await this.findBySheetId(sheetId);
    if (!mpesaBankStatement) {
      throw new Error(`Mpesa bank statement with sheetId ${sheetId} not found`);
    }

    return this.prisma.mpesaBankStatement.update({
      where: { id: mpesaBankStatement.id },
      data: convertedData,
    });
  }

  /**
   * Update mpesa bank statement by database ID
   * This method avoids sheetId conflicts by using the numeric database ID directly
   */
  async updateById(id: number, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating mpesa bank statement by ID with data:', {
      id,
      creditApplicationId: data.creditApplicationId,
      type: data.type,
      allConvertedData: convertedData,
    });

    return this.prisma.mpesaBankStatement.update({
      where: { id },
      data: convertedData,
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.mpesaBankStatement.update({
      where: { id },
      data: { synced },
    });
  }

  /**
   * Delete mpesa bank statement by ID
   */
  async delete(id: string) {
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.mpesaBankStatement.delete({
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
      } else if (key === 'Credit Application' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (
        key === 'Personal Or Business Account' &&
        typeof value === 'string'
      ) {
        convertedData[dbFieldName] = value;
      } else if (key === 'Type' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Account Details' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Description' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Statement' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Statement Start Date' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Statement End Date' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Total Revenue' && typeof value === 'number') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Converted Excel File' && typeof value === 'string') {
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
