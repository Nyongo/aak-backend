import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DirectorsDbService {
  private readonly logger = new Logger(DirectorsDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    dbId: 'id',
    sheetId: 'sheetId',
    ID: 'sheetId',
    'Borrower ID': 'borrowerId',
    Name: 'name',
    'National ID Number': 'nationalIdNumber',
    'KRA Pin Number': 'kraPinNumber',
    'Phone Number': 'phoneNumber',
    Email: 'email',
    Gender: 'gender',
    'Role in School': 'roleInSchool',
    Status: 'status',
    'Date of Birth': 'dateOfBirth',
    'Education Level': 'educationLevel',
    'Insured for Credit Life?': 'insuredForCreditLife',
    Address: 'address',
    'Postal Address': 'postalAddress',
    'National ID Front': 'nationalIdFront',
    'National ID Back': 'nationalIdBack',
    'KRA Pin Photo': 'kraPinPhoto',
    'Passport Photo': 'passportPhoto',
    'Created At': 'createdAt',
    Type: 'roleInSchool',
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

  async findAll() {
    return this.prisma.director.findMany();
  }

  async findByBorrowerId(borrowerId: string) {
    return this.prisma.director.findMany({
      where: { borrowerId },
    });
  }

  async findUnsynced() {
    return this.prisma.director.findMany({
      where: { synced: false },
    });
  }

  async findSynced() {
    return this.prisma.director.findMany({
      where: { synced: true },
    });
  }

  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.director.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, check for sheetId or name
    return this.prisma.director.findFirst({
      where: {
        OR: [{ sheetId: id }, { name: id }],
      },
    });
  }

  async findBySheetId(sheetId: string) {
    return this.prisma.director.findFirst({
      where: { sheetId },
    });
  }

  async findByName(name: string) {
    return this.prisma.director.findFirst({
      where: { name },
    });
  }

  async create(data: any) {
    // Convert data types to match database schema
    const convertedData = this.convertDataTypes(data);

    // Debug logging
    this.logger.log('Creating director with data:', {
      originalPhoneNumber: data.phoneNumber,
      convertedPhoneNumber: convertedData.phoneNumber,
      allConvertedData: convertedData,
    });

    return this.prisma.director.create({ data: convertedData });
  }

  async update(id: string, data: any) {
    // Convert data types to match database schema
    const convertedData = this.convertDataTypes(data);

    // Debug logging for update
    this.logger.log('Updating director with data:', {
      id,
      originalPhoneNumber: data.phoneNumber,
      convertedPhoneNumber: convertedData.phoneNumber,
      allConvertedData: convertedData,
    });

    return this.prisma.director.update({
      where: { id: parseInt(id) },
      data: convertedData,
    });
  }

  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.director.update({
      where: { id },
      data: { synced },
    });
  }

  async delete(id: string) {
    return this.prisma.director.delete({
      where: { id: parseInt(id) },
    });
  }

  // Helper method to convert data types for database compatibility
  private convertDataTypes(data: any): any {
    const converted: any = { ...data };

    // Convert number fields to strings if they should be strings
    const stringFields = [
      'borrowerId',
      'name',
      'nationalIdNumber',
      'kraPinNumber',
      'phoneNumber',
      'email',
      'gender',
      'roleInSchool',
      'status',
      'dateOfBirth',
      'educationLevel',
      'insuredForCreditLife',
      'address',
      'postalAddress',
      'nationalIdFront',
      'nationalIdBack',
      'kraPinPhoto',
      'passportPhoto',
    ];

    for (const field of stringFields) {
      if (converted[field] !== undefined && converted[field] !== null) {
        if (typeof converted[field] === 'number') {
          converted[field] = converted[field].toString();
        } else if (typeof converted[field] === 'boolean') {
          converted[field] = converted[field].toString();
        }
      }
    }

    return converted;
  }

  // Convert DB format to sheet-style response
  private convertDbToSheet(dbData: any): any {
    const sheetData: any = {};

    for (const [dbKey, sheetKey] of Object.entries(
      this.dbToSheetMappingWithSync,
    )) {
      if (dbData[dbKey] !== undefined) {
        sheetData[sheetKey] = dbData[dbKey];
      }
    }

    this.logger.debug(`Converting DB record to sheet format:`, {
      originalRecord: dbData,
      convertedRecord: sheetData,
    });

    return sheetData;
  }

  // Convert multiple DB records to sheet format
  convertDbArrayToSheet(dbArray: any[]): any[] {
    return dbArray.map((item) => this.convertDbToSheet(item));
  }
}
