import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BorrowersDbService {
  private readonly logger = new Logger(BorrowersDbService.name);

  // Key mappings to preserve the same payload structure as Sheets
  private readonly sheetToDbMapping = {
    dbId: 'id',
    sheetId: 'sheetId',
    'SSL ID': 'sslId',
    'Customer Type': 'customerType',
    Type: 'type',
    Name: 'name',
    'Location Description': 'locationDescription',
    'Society, CBO, or Corporation': 'entityType',
    'Year Founded': 'yearFounded',
    'Location Pin': 'locationPin',
    'Historical Payment Details': 'historicalPaymentDetails',
    'Payment Method': 'paymentMethod',
    'Bank Name': 'bankName',
    'Account Name': 'accountName',
    'Account Number': 'accountNumber',
    'Primary Phone for Borrower': 'primaryPhone',
    'Document Verifying Payment Account': 'documentVerifyingAccount',
    'Manager Verification': 'managerVerification',
    'Manager Verification of Payment Account': 'managerVerification',
    Status: 'status',
    Notes: 'notes',
    'Entity Type': 'entityType',
    'Registration Number of CBO, Society, or Corporation': 'registrationNumber',
    'Notes on Status': 'notesOnStatus',
    'Official Search': 'officialSearch',
    'Peleza Search': 'pelezaSearch',
    'Products Requested': 'productsRequested',
    'Data Collection Progress': 'dataCollectionProgress',
    'Initial Contact Details and Notes': 'initialContactNotes',
    'KRA PIN Photo': 'kraPinPhoto',
    'KRA PIN Number': 'kraPinNumber',
    'Created At': 'createdAt',
    'Created By': 'createdBy',
    'How did the borrower hear about Jackfruit?': 'howHeard',
    'Month And Year Created': 'monthYearCreated',
    'Certified by the MOE?': 'moeCertified',
    'MOE Certificate': 'moeCertificate',
    County: 'county',
    CR12: 'cr12',
    'National ID Number': 'nationalIdNumber',
    'National ID Front': 'nationalIdFront',
    'National ID Back': 'nationalIdBack',
    'Date of Birth': 'dateOfBirth',
    'Private or APBET': 'privateOrApbet',
    'Society/CBO/Incorporation Certificate': 'societyCertificate',
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

  async createMany(borrowers: any[]) {
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    const skippedRows: any[] = [];
    const errorRows: any[] = [];

    for (const borrower of borrowers) {
      // Skip if both sheetId and name are missing
      if (!borrower.sheetId && !borrower.name) {
        skipped++;
        skippedRows.push({ reason: 'Missing sheetId and name', borrower });
        this.logger.warn(
          `Skipped row: missing sheetId and name: ${JSON.stringify(borrower)}`,
        );
        continue;
      }
      try {
        await this.prisma.borrower.upsert({
          where: {
            sheetId: borrower.sheetId ?? undefined,
            name: borrower.name ?? undefined,
          },
          update: borrower,
          create: borrower,
        });
        inserted++;
      } catch (error) {
        errors++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errorRows.push({ error: errorMessage, borrower });
        this.logger.error(
          `Error inserting row: ${errorMessage} | Data: ${JSON.stringify(borrower)}`,
        );
        continue;
      }
    }
    return {
      success: true,
      inserted,
      skipped,
      errors,
      skippedRows,
      errorRows,
      total: borrowers.length,
    };
  }

  async findAll() {
    return this.prisma.borrower.findMany();
  }

  async findBySslId(sslId: string) {
    return this.prisma.borrower.findMany({
      where: { sslId },
    });
  }

  async findUnsynced() {
    return this.prisma.borrower.findMany({
      where: { synced: false },
    });
  }

  async findSynced() {
    return this.prisma.borrower.findMany({
      where: { synced: true },
    });
  }

  async findById(id: string) {
    // Check if id is a numeric database ID first
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      return this.prisma.borrower.findFirst({
        where: { id: numericId },
      });
    }

    // If not numeric, check for sheetId or name
    return this.prisma.borrower.findFirst({
      where: {
        OR: [{ sheetId: id }, { name: id }],
      },
    });
  }

  async findBySheetId(sheetId: string) {
    return this.prisma.borrower.findFirst({
      where: { sheetId },
    });
  }

  async findByName(name: string) {
    return this.prisma.borrower.findFirst({
      where: { name },
    });
  }

  async create(data: any) {
    // Convert data types to match database schema
    const convertedData = this.convertDataTypes(data);

    return this.prisma.borrower.create({ data: convertedData });
  }

  async update(id: string, data: any) {
    // Convert data types to match database schema
    const convertedData = this.convertDataTypes(data);

    return this.prisma.borrower.update({
      where: { id: parseInt(id) },
      data: convertedData,
    });
  }

  // Helper method to convert data types for database compatibility
  private convertDataTypes(data: any): any {
    const converted: any = { ...data };

    // Convert number fields to strings if they should be strings
    const stringFields = [
      'yearFounded',
      'sslId',
      'customerType',
      'type',
      'name',
      'locationDescription',
      'entityType',
      'locationPin',
      'historicalPaymentDetails',
      'paymentMethod',
      'bankName',
      'accountName',
      'accountNumber',
      'primaryPhone',
      'documentVerifyingAccount',
      'managerVerification',
      'status',
      'notes',
      'registrationNumber',
      'notesOnStatus',
      'officialSearch',
      'pelezaSearch',
      'productsRequested',
      'initialContactNotes',
      'kraPinPhoto',
      'kraPinNumber',
      'createdBy',
      'howHeard',
      'monthYearCreated',
      'moeCertified',
      'moeCertificate',
      'county',
      'cr12',
      'nationalIdNumber',
      'nationalIdFront',
      'nationalIdBack',
      'dateOfBirth',
      'privateOrApbet',
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

  async updateSyncStatus(id: number, synced: boolean) {
    return this.prisma.borrower.update({
      where: { id },
      data: { synced },
    });
  }

  async delete(id: string) {
    return this.prisma.borrower.delete({
      where: { id: parseInt(id) },
    });
  }

  // Convert sheet-style payload to DB format
  private convertSheetToDb(sheetData: any): any {
    const dbData: any = {};

    for (const [sheetKey, dbKey] of Object.entries(this.sheetToDbMapping)) {
      if (sheetData[sheetKey] !== undefined) {
        let value = sheetData[sheetKey];
        const originalValue = value;

        // Handle data type conversions
        if (value !== null && value !== undefined) {
          // Convert numbers to strings for string fields
          if (typeof value === 'number' && this.isStringField(dbKey)) {
            value = value.toString();
            this.logger.debug(
              `Converting number to string: ${sheetKey} (${originalValue}) -> ${dbKey} (${value})`,
            );
          }
          // Convert booleans to strings for string fields
          else if (typeof value === 'boolean' && this.isStringField(dbKey)) {
            value = value.toString();
            this.logger.debug(
              `Converting boolean to string: ${sheetKey} (${originalValue}) -> ${dbKey} (${value})`,
            );
          }
          // Convert empty strings to null for optional fields
          else if (value === '' && this.isOptionalField(dbKey)) {
            value = null;
            this.logger.debug(
              `Converting empty string to null: ${sheetKey} -> ${dbKey}`,
            );
          }
        }

        dbData[dbKey] = value;
      }
    }

    this.logger.debug(
      `Converted sheet data to DB format: ${JSON.stringify(dbData)}`,
    );
    return dbData;
  }

  // Helper method to check if a field should be a string
  private isStringField(dbKey: string): boolean {
    const stringFields = [
      'sslId',
      'customerType',
      'type',
      'name',
      'locationDescription',
      'societyCertificate',
      'yearFounded',
      'locationPin',
      'historicalPaymentDetails',
      'paymentMethod',
      'bankName',
      'accountName',
      'accountNumber',
      'primaryPhone',
      'documentVerifyingAccount',
      'managerVerification',
      'status',
      'notes',
      'entityType',
      'registrationNumber',
      'notesOnStatus',
      'officialSearch',
      'pelezaSearch',
      'productsRequested',
      'initialContactNotes',
      'kraPinPhoto',
      'kraPinNumber',
      'createdBy',
      'howHeard',
      'monthYearCreated',
      'moeCertified',
      'moeCertificate',
      'county',
      'cr12',
      'nationalIdNumber',
      'nationalIdFront',
      'nationalIdBack',
      'dateOfBirth',
      'privateOrApbet',
      'relatedCreditApplications',
      'relatedHandoversGivingId',
      'relatedHandoversReceivingId',
      'relatedCrbConsents',
      'relatedCollaterals',
      'relatedUsers',
      'relatedReferrers',
      'relatedCustomerCareCalls',
      'relatedEscalations',
      'relatedEnrollmentReports',
      'relatedLoans',
      'relatedDirPaymentSchedules',
      'relatedCollateralsByLoanId',
    ];
    return stringFields.includes(dbKey);
  }

  // Helper method to check if a field is optional
  private isOptionalField(dbKey: string): boolean {
    const requiredFields = ['id', 'sheetId']; // Add any required fields here
    return !requiredFields.includes(dbKey);
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

    return sheetData;
  }

  // Convert multiple DB records to sheet format
  convertDbArrayToSheet(dbArray: any[]): any[] {
    return dbArray.map((item) => this.convertDbToSheet(item));
  }
}
