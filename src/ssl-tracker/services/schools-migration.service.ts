import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SheetsService } from '../../jf/services/sheets.service';
import { CommonFunctionsService } from '../../common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class SchoolsMigrationService {
  private readonly logger = new Logger(SchoolsMigrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sheetsService: SheetsService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async migrateSchoolsFromSheet() {
    try {
      this.logger.log('Starting Schools migration from Google Sheet...');

      // Get all schools from the Google Sheet
      const sheetData = await this.sheetsService.getSheetData('Borrowers');

      if (!sheetData || sheetData.length === 0) {
        return this.commonFunctions.returnFormattedResponse(
          404,
          'No data found in Borrowers sheet',
          null,
        );
      }

      const headers = sheetData[0];
      const schoolRows = sheetData.slice(1);

      this.logger.log(`Found ${schoolRows.length} schools in the sheet`);
      this.logger.debug('Sheet headers:', headers);

      const results = {
        total: schoolRows.length,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        details: [],
      };

      // Process each school row
      for (let i = 0; i < schoolRows.length; i++) {
        const row = schoolRows[i];
        const rowNumber = i + 2; // +2 because we start from row 2 (after headers)

        try {
          // Create school object from row data
          const schoolData = {};
          headers.forEach((header, index) => {
            schoolData[header] = row[index] || null;
          });

          // Map sheet data to database fields
          const mappedSchool = this.mapSheetDataToSchool(schoolData);

          if (!mappedSchool.id) {
            results.skipped++;
            results.details.push({
              row: rowNumber,
              name: mappedSchool.name || 'N/A',
              status: 'skipped',
              reason: 'No ID provided',
            });
            continue;
          }

          if (!mappedSchool.name) {
            results.skipped++;
            results.details.push({
              row: rowNumber,
              name: 'N/A',
              status: 'skipped',
              reason: 'No name provided',
            });
            continue;
          }

          // Check if school already exists by ID
          const existingSchool = await this.prisma.school.findUnique({
            where: { id: mappedSchool.id },
          });

          if (existingSchool) {
            // Update existing school
            const updatedSchool = await this.updateSchool(
              existingSchool.id,
              mappedSchool,
            );
            results.updated++;
            results.details.push({
              row: rowNumber,
              name: mappedSchool.name,
              status: 'updated',
              schoolId: updatedSchool.id,
            });
          } else {
            // Create new school
            const newSchool = await this.createSchool(mappedSchool);
            results.created++;
            results.details.push({
              row: rowNumber,
              name: mappedSchool.name,
              status: 'created',
              schoolId: newSchool.id,
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
        'Schools migration completed successfully',
        results,
      );
    } catch (error) {
      this.logger.error('Error during Schools migration:', error);
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  private mapSheetDataToSchool(sheetData: any) {
    // Map Google Sheet columns to School database fields
    const mappedSchool = {
      id: sheetData['ID'] || sheetData['id'] || this.generateId(),
      name:
        sheetData['Name'] ||
        sheetData['School Name'] ||
        sheetData['name'] ||
        'Unknown School',
      schoolId:
        sheetData['School ID'] ||
        sheetData['ID'] ||
        sheetData['id'] ||
        this.generateSchoolId(),
      sslId: sheetData['SSL ID'] || sheetData['sslId'] || null,
      locationPin:
        sheetData['Location Pin'] ||
        sheetData['LocationPin'] ||
        sheetData['locationPin'] ||
        null,
      email: sheetData['Email'] || sheetData['email'] || null,
      phoneNumber:
        sheetData['Phone Number'] ||
        sheetData['Phone'] ||
        sheetData['phoneNumber'] ||
        null,
      address: sheetData['Address'] || sheetData['address'] || null,
      postalAddress:
        sheetData['Postal Address'] || sheetData['postalAddress'] || null,
      county: sheetData['County'] || sheetData['county'] || null,
      region: sheetData['Region'] || sheetData['region'] || null,
      schoolType:
        sheetData['School Type'] ||
        sheetData['Type'] ||
        sheetData['schoolType'] ||
        null,
      status: sheetData['Status'] || 'Active',
      principalName:
        sheetData['Principal Name'] ||
        sheetData['Principal'] ||
        sheetData['principalName'] ||
        null,
      principalPhone:
        sheetData['Principal Phone'] || sheetData['principalPhone'] || null,
      principalEmail:
        sheetData['Principal Email'] || sheetData['principalEmail'] || null,
      totalStudents: this.parseNumber(
        sheetData['Total Students'] ||
          sheetData['Students'] ||
          sheetData['totalStudents'],
      ),
      totalTeachers: this.parseNumber(
        sheetData['Total Teachers'] ||
          sheetData['Teachers'] ||
          sheetData['totalTeachers'],
      ),
      registrationNumber:
        sheetData['Registration Number'] ||
        sheetData['Reg Number'] ||
        sheetData['registrationNumber'] ||
        null,
      establishmentDate:
        sheetData['Establishment Date'] ||
        sheetData['Founded'] ||
        sheetData['establishmentDate'] ||
        null,
      isActive: this.parseBoolean(
        sheetData['Active'] || sheetData['isActive'] || 'true',
      ),
    };

    return mappedSchool;
  }

  private generateId(): string {
    return `SCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSchoolId(): string {
    return `SCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    return false;
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  private async createSchool(schoolData: any) {
    const newSchool = await this.prisma.school.create({
      data: schoolData,
      select: {
        id: true,
        name: true,
        schoolId: true,
        isActive: true,
        createdAt: true,
      },
    });

    this.logger.log(`Created School: ${newSchool.name} (ID: ${newSchool.id})`);
    return newSchool;
  }

  private async updateSchool(schoolId: string, schoolData: any) {
    const updatedSchool = await this.prisma.school.update({
      where: { id: schoolId },
      data: schoolData,
      select: {
        id: true,
        name: true,
        schoolId: true,
        isActive: true,
      },
    });

    this.logger.log(
      `Updated School: ${updatedSchool.name} (ID: ${updatedSchool.id})`,
    );
    return updatedSchool;
  }

  async getMigrationStatus() {
    try {
      const [totalSchools, activeSchools, inactiveSchools] = await Promise.all([
        this.prisma.school.count(),
        this.prisma.school.count({ where: { isActive: true } }),
        this.prisma.school.count({ where: { isActive: false } }),
      ]);

      return this.commonFunctions.returnFormattedResponse(
        200,
        'Migration status retrieved successfully',
        {
          totalSchools,
          activeSchools,
          inactiveSchools,
          lastMigration: new Date().toISOString(),
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
      this.logger.log('Previewing Schools migration...');

      const sheetData = await this.sheetsService.getSheetData('Borrowers');

      if (!sheetData || sheetData.length === 0) {
        return this.commonFunctions.returnFormattedResponse(
          404,
          'No data found in Borrowers sheet',
          null,
        );
      }

      const headers = sheetData[0];
      const schoolRows = sheetData.slice(1);

      const preview = {
        totalRows: schoolRows.length,
        headers: headers,
        sampleData: schoolRows.slice(0, 5).map((row, index) => {
          const schoolData = {};
          headers.forEach((header, colIndex) => {
            schoolData[header] = row[colIndex] || null;
          });
          return {
            rowNumber: index + 2,
            data: schoolData,
            mappedSchool: this.mapSheetDataToSchool(schoolData),
          };
        }),
        fieldMapping: {
          ID: 'id',
          Name: 'name',
          'School ID': 'schoolId',
          Email: 'email',
          'Phone Number': 'phoneNumber',
          Address: 'address',
          County: 'county',
          Region: 'region',
          'School Type': 'schoolType',
          Status: 'status',
          'Principal Name': 'principalName',
          'Total Students': 'totalStudents',
          'Total Teachers': 'totalTeachers',
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
