import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SheetsService } from '../../jf/services/sheets.service';
import { CommonFunctionsService } from '../../common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UserMigrationService {
  private readonly logger = new Logger(UserMigrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sheetsService: SheetsService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async migrateUsersFromSheet() {
    try {
      this.logger.log('Starting SSL Staff migration from Google Sheet...');

      // Get all users from the Google Sheet
      const sheetData = await this.sheetsService.getSheetData('Users');

      if (!sheetData || sheetData.length === 0) {
        return this.commonFunctions.returnFormattedResponse(
          404,
          'No data found in Users sheet',
          null,
        );
      }

      const headers = sheetData[0];
      const userRows = sheetData.slice(1);

      this.logger.log(`Found ${userRows.length} users in the sheet`);
      this.logger.debug('Sheet headers:', headers);

      const results = {
        total: userRows.length,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        details: [],
      };

      // Process each user row
      for (let i = 0; i < userRows.length; i++) {
        const row = userRows[i];
        const rowNumber = i + 2; // +2 because we start from row 2 (after headers)

        try {
          // Create user object from row data
          const userData = {};
          headers.forEach((header, index) => {
            userData[header] = row[index] || null;
          });

          // Map sheet data to database fields
          const mappedStaff = this.mapSheetDataToSslStaff(userData);

          if (!mappedStaff.id) {
            results.skipped++;
            results.details.push({
              row: rowNumber,
              email: mappedStaff.email || 'N/A',
              status: 'skipped',
              reason: 'No ID provided',
            });
            continue;
          }

          if (!mappedStaff.email) {
            results.skipped++;
            results.details.push({
              row: rowNumber,
              email: 'N/A',
              status: 'skipped',
              reason: 'No email provided',
            });
            continue;
          }

          // Check if staff already exists by ID
          const existingStaff = await this.prisma.sslStaff.findUnique({
            where: { id: mappedStaff.id },
          });

          if (existingStaff) {
            // Update existing staff
            const updatedStaff = await this.updateSslStaff(
              existingStaff.id,
              mappedStaff,
            );
            results.updated++;
            results.details.push({
              row: rowNumber,
              email: mappedStaff.email,
              status: 'updated',
              staffId: updatedStaff.id,
            });
          } else {
            // Create new staff
            const newStaff = await this.createSslStaff(mappedStaff);
            results.created++;
            results.details.push({
              row: rowNumber,
              email: mappedStaff.email,
              status: 'created',
              staffId: newStaff.id,
            });
          }
        } catch (error) {
          this.logger.error(`Error processing row ${rowNumber}:`, error);
          results.errors.push({
            row: rowNumber,
            error: (error as Error).message,
            data: row,
          });
        }
      }

      this.logger.log(
        `Migration completed. Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
      );

      return this.commonFunctions.returnFormattedResponse(
        200,
        'SSL Staff migration completed successfully',
        results,
      );
    } catch (error) {
      this.logger.error('Error during SSL Staff migration:', error);
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  private mapSheetDataToSslStaff(sheetData: any) {
    // Map Google Sheet columns to SslStaff database fields
    const mappedStaff = {
      id: sheetData['ID'] || sheetData['id'] || this.generateId(), // Use ID from sheet as primary key
      name: sheetData['Name'] || sheetData['name'] || 'Unknown',
      type: sheetData['Type'] || sheetData['User Type'] || 'Staff',
      borrowerId:
        sheetData['ID'] ||
        sheetData['Borrower ID'] ||
        this.generateBorrowerId(),
      email: sheetData['Email'] || sheetData['email'],
      sslId: sheetData['SSL ID'] || sheetData['sslId'] || this.generateSslId(),
      nationalIdNumber:
        sheetData['National ID Number'] || sheetData['nationalIdNumber'] || '',
      nationalIdFront:
        sheetData['National ID Front'] || sheetData['nationalIdFront'] || null,
      nationalIdBack:
        sheetData['National ID Back'] || sheetData['nationalIdBack'] || null,
      kraPinNumber:
        sheetData['KRA Pin Number'] || sheetData['kraPinNumber'] || null,
      kraPinPhoto:
        sheetData['KRA Pin Photo'] || sheetData['kraPinPhoto'] || null,
      phoneNumber: sheetData['Phone Number'] || sheetData['phoneNumber'] || '',
      status: sheetData['Status'] || 'Active',
      roleInSchool:
        sheetData['Role In School'] || sheetData['roleInSchool'] || 'Staff',
      dateOfBirth: sheetData['Date of Birth'] || sheetData['dateOfBirth'] || '',
      address: sheetData['Address'] || sheetData['address'] || '',
      gender: sheetData['Gender'] || sheetData['gender'] || 'Unknown',
      postalAddress:
        sheetData['Postal Address'] || sheetData['postalAddress'] || null,
      startDate:
        sheetData['Start Date'] ||
        sheetData['startDate'] ||
        new Date().toISOString(),
      insuredForCreditLife: this.parseBoolean(
        sheetData['Insured For Credit Life'] ||
          sheetData['insuredForCreditLife'] ||
          'false',
      ),
      paymentThisMonth: this.parseBoolean(
        sheetData['Payment This Month'] ||
          sheetData['paymentThisMonth'] ||
          'false',
      ),
      terminationDate:
        sheetData['Termination Date'] || sheetData['terminationDate'] || null,
      educationLevel:
        sheetData['Education Level'] || sheetData['educationLevel'] || null,
      sslEmail: sheetData['SSL Email'] || sheetData['sslEmail'] || null,
      secondaryRole:
        sheetData['Secondary Role'] || sheetData['secondaryRole'] || null,
      monthlyTarget:
        sheetData['Monthly Target'] || sheetData['monthlyTarget'] || null,
      creditLifeHelper:
        sheetData['Credit Life Helper'] ||
        sheetData['creditLifeHelper'] ||
        null,
      teamLeader: sheetData['Team Leader'] || sheetData['teamLeader'] || null,
      passportPhoto:
        sheetData['Passport Photo'] || sheetData['passportPhoto'] || null,
      sslLevel: sheetData['SSL Level'] || sheetData['sslLevel'] || null,
      sslArea: sheetData['SSL Area'] || sheetData['sslArea'] || null,
      isActive: this.parseBoolean(
        sheetData['Active'] || sheetData['isActive'] || 'true',
      ),
      createdById: 1, // Default to user ID 1, should be updated based on authenticated user
    };

    return mappedStaff;
  }

  private generateId(): string {
    return `ID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBorrowerId(): string {
    return `B-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSslId(): string {
    return `SSL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      return (
        lowerValue === 'true' ||
        lowerValue === 'yes' ||
        lowerValue === '1' ||
        lowerValue === 'active'
      );
    }
    return false; // Default to false for boolean fields
  }

  private async createSslStaff(staffData: any) {
    const newStaff = await this.prisma.sslStaff.create({
      data: staffData,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    this.logger.log(
      `Created SSL Staff: ${newStaff.email} (ID: ${newStaff.id})`,
    );
    return newStaff;
  }

  private async updateSslStaff(staffId: string, staffData: any) {
    const updatedStaff = await this.prisma.sslStaff.update({
      where: { id: staffId },
      data: staffData,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    this.logger.log(
      `Updated SSL Staff: ${updatedStaff.email} (ID: ${updatedStaff.id})`,
    );
    return updatedStaff;
  }

  async getMigrationStatus() {
    try {
      const [totalStaff, activeStaff, inactiveStaff] = await Promise.all([
        this.prisma.sslStaff.count(),
        this.prisma.sslStaff.count({ where: { isActive: true } }),
        this.prisma.sslStaff.count({ where: { isActive: false } }),
      ]);

      return this.commonFunctions.returnFormattedResponse(
        200,
        'Migration status retrieved successfully',
        {
          totalStaff,
          activeStaff,
          inactiveStaff,
          lastMigration: new Date().toISOString(), // You might want to store this in a separate table
        },
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async previewMigration() {
    try {
      this.logger.log('Previewing SSL Staff migration...');

      const sheetData = await this.sheetsService.getSheetData('Users');

      if (!sheetData || sheetData.length === 0) {
        return this.commonFunctions.returnFormattedResponse(
          404,
          'No data found in Users sheet',
          null,
        );
      }

      const headers = sheetData[0];
      const userRows = sheetData.slice(1);

      const preview = {
        totalRows: userRows.length,
        headers: headers,
        sampleData: userRows.slice(0, 5).map((row, index) => {
          const userData = {};
          headers.forEach((header, colIndex) => {
            userData[header] = row[colIndex] || null;
          });
          return {
            rowNumber: index + 2,
            data: userData,
            mappedStaff: this.mapSheetDataToSslStaff(userData),
          };
        }),
        fieldMapping: {
          Name: 'name',
          Type: 'type',
          ID: 'borrowerId',
          Email: 'email',
          'SSL ID': 'sslId',
          'National ID Number': 'nationalIdNumber',
          'Phone Number': 'phoneNumber',
          Status: 'status',
          'Role In School': 'roleInSchool',
          'Date of Birth': 'dateOfBirth',
          Address: 'address',
          Gender: 'gender',
          'Start Date': 'startDate',
          'Education Level': 'educationLevel',
        },
      };

      return this.commonFunctions.returnFormattedResponse(
        200,
        'Migration preview generated successfully',
        preview,
      );
    } catch (error) {
      this.logger.error('Error during migration preview:', error);
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}
