import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CrbConsentDbService {
  private readonly logger = new Logger(CrbConsentDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    ID: 'sheetId',
    'Borrower ID': 'borrowerId',
    Agreement: 'agreement',
    'Signed By Name': 'signedByName',
    Date: 'date',
    'Role in Organization': 'roleInOrganization',
    Signature: 'signature',
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
   * Create a new CRB consent record
   */
  async create(data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Creating CRB consent with data:', {
      borrowerId: data.borrowerId,
      agreement: data.agreement,
      allConvertedData: convertedData,
    });
    return this.prisma.crbConsent.create({ data: convertedData });
  }

  /**
   * Find all CRB consents
   */
  async findAll() {
    return this.prisma.crbConsent.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find CRB consent by ID
   */
  async findById(id: string) {
    return this.prisma.crbConsent.findUnique({
      where: { id: parseInt(id) },
    });
  }

  /**
   * Find CRB consents by borrower ID
   */
  async findByBorrowerId(borrowerId: string) {
    return this.prisma.crbConsent.findMany({
      where: { borrowerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find CRB consent by sheet ID
   */
  async findBySheetId(sheetId: string) {
    return this.prisma.crbConsent.findUnique({
      where: { sheetId },
    });
  }

  /**
   * Find unsynced CRB consents
   */
  async findUnsynced() {
    return this.prisma.crbConsent.findMany({
      where: { synced: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update CRB consent
   */
  async update(id: string, data: any) {
    const convertedData = this.convertDataTypes(data);
    this.logger.log('Updating CRB consent with data:', {
      id,
      borrowerId: data.borrowerId,
      agreement: data.agreement,
      allConvertedData: convertedData,
    });
    return this.prisma.crbConsent.update({
      where: { id: parseInt(id) },
      data: convertedData,
    });
  }

  /**
   * Delete CRB consent
   */
  async delete(id: string) {
    return this.prisma.crbConsent.delete({
      where: { id: parseInt(id) },
    });
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.crbConsent.update({
      where: { id },
      data: { synced },
    });
  }

  /**
   * Convert data types for database storage
   */
  private convertDataTypes(data: any) {
    const stringFields = [
      'sheetId',
      'borrowerId',
      'agreement',
      'signedByName',
      'date',
      'roleInOrganization',
      'signature',
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
