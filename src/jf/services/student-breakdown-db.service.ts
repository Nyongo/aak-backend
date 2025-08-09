import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentBreakdownDbService {
  private readonly logger = new Logger(StudentBreakdownDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application': 'creditApplicationId',
    'Fee Type': 'feeType',
    'Term ID': 'term',
    Grade: 'grade',
    'Number of Students': 'numberOfStudents',
    Fee: 'fee',
    'Total Revenue': 'totalRevenue',
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
   * Find all student breakdowns
   */
  async findAll() {
    return this.prisma.studentBreakdown.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find student breakdowns by credit application ID
   */
  async findByCreditApplicationId(creditApplicationId: string) {
    return this.prisma.studentBreakdown.findMany({
      where: { creditApplicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find unsynced student breakdowns
   */
  async findUnsynced() {
    return this.prisma.studentBreakdown.findMany({
      where: { synced: false },
    });
  }

  /**
   * Find synced student breakdowns
   */
  async findSynced() {
    return this.prisma.studentBreakdown.findMany({
      where: { synced: true },
    });
  }

  /**
   * Find student breakdown by ID
   */
  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.studentBreakdown.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, try to find by sheetId or creditApplicationId
    return this.prisma.studentBreakdown.findFirst({
      where: {
        OR: [{ sheetId: id }, { creditApplicationId: id }],
      },
    });
  }

  /**
   * Find student breakdown by sheet ID
   */
  async findBySheetId(sheetId: string) {
    return this.prisma.studentBreakdown.findFirst({
      where: { sheetId },
    });
  }

  /**
   * Create a new student breakdown record
   */
  async create(data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Creating student breakdown with data:', {
      creditApplicationId: data.creditApplicationId,
      feeType: data.feeType,
      grade: data.grade,
      allConvertedData: convertedData,
    });
    return this.prisma.studentBreakdown.create({ data: convertedData });
  }

  /**
   * Update student breakdown by sheetId
   * Note: We always use sheetId for updates since the controller uses findBySheetId
   */
  async update(sheetId: string, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating student breakdown with data:', {
      sheetId,
      creditApplicationId: data.creditApplicationId,
      feeType: data.feeType,
      allConvertedData: convertedData,
    });

    // Find the record by sheetId to get the numeric database ID
    const studentBreakdown = await this.findBySheetId(sheetId);
    if (!studentBreakdown) {
      throw new Error(`Student breakdown with sheetId ${sheetId} not found`);
    }

    return this.prisma.studentBreakdown.update({
      where: { id: studentBreakdown.id },
      data: convertedData,
    });
  }

  /**
   * Update student breakdown by database ID
   */
  async updateById(id: number, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating student breakdown by ID with data:', {
      id,
      creditApplicationId: data.creditApplicationId,
      feeType: data.feeType,
      allConvertedData: convertedData,
    });

    return this.prisma.studentBreakdown.update({
      where: { id },
      data: convertedData,
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.studentBreakdown.update({
      where: { id },
      data: { synced },
    });
  }

  /**
   * Delete student breakdown by ID
   */
  async delete(id: string) {
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.studentBreakdown.delete({
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
      } else if (key === 'Fee Type' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Term ID' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Grade' && typeof value === 'string') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Number of Students' && typeof value === 'number') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Fee' && typeof value === 'number') {
        convertedData[dbFieldName] = value;
      } else if (key === 'Total Revenue' && typeof value === 'number') {
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
