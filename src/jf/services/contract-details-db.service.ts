import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContractDetailsDbService {
  private readonly logger = new Logger(ContractDetailsDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.contractDetails.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error finding all contract details:', error);
      throw error;
    }
  }

  async findByCreditApplicationId(creditApplicationId: string) {
    try {
      return await this.prisma.contractDetails.findMany({
        where: { creditApplicationId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding contract details by credit application ID ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  async findUnsynced() {
    try {
      return await this.prisma.contractDetails.findMany({
        where: { synced: false },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error finding unsynced contract details:', error);
      throw error;
    }
  }

  async findSynced() {
    try {
      return await this.prisma.contractDetails.findMany({
        where: { synced: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error finding synced contract details:', error);
      throw error;
    }
  }

  async findById(id: string) {
    try {
      return await this.prisma.contractDetails.findUnique({
        where: { id: parseInt(id) },
      });
    } catch (error) {
      this.logger.error(`Error finding contract details by ID ${id}:`, error);
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.contractDetails.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(
        `Error finding contract details by sheet ID ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async create(data: any) {
    try {
      return await this.prisma.contractDetails.create({
        data: data, // Data is already in database format
      });
    } catch (error) {
      this.logger.error('Error creating contract details:', error);
      throw error;
    }
  }

  async update(sheetId: string, data: any) {
    try {
      return await this.prisma.contractDetails.update({
        where: { sheetId },
        data: this.convertSheetDataToDb(data),
      });
    } catch (error) {
      this.logger.error(`Error updating contract details ${sheetId}:`, error);
      throw error;
    }
  }

  async updateById(id: number, data: any) {
    try {
      return await this.prisma.contractDetails.update({
        where: { id },
        data: data, // Data is already in database format
      });
    } catch (error) {
      this.logger.error(`Error updating contract details by id ${id}:`, error);
      throw error;
    }
  }

  async updateSyncStatus(id: number, synced: boolean) {
    try {
      return await this.prisma.contractDetails.update({
        where: { id },
        data: { synced },
      });
    } catch (error) {
      this.logger.error(
        `Error updating sync status for contract details ${id}:`,
        error,
      );
      throw error;
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.contractDetails.delete({
        where: { id: parseInt(id) },
      });
    } catch (error) {
      this.logger.error(`Error deleting contract details ${id}:`, error);
      throw error;
    }
  }

  // Mapping between database fields and Google Sheets columns
  private sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'Loan Length Requested (Months)': 'loanLengthRequestedMonths',
    'Months the School Requests Forgiveness': 'monthsSchoolRequestsForgiveness',
    'Disbursal Date Requested': 'disbursalDateRequested',
    '10% Down on Vehicle or Land Financing?':
      'tenPercentDownOnVehicleOrLandFinancing',
    'Created By': 'createdBy',
  };

  private dbToSheetMapping = {
    sheetId: 'ID',
    creditApplicationId: 'Credit Application ID',
    loanLengthRequestedMonths: 'Loan Length Requested (Months)',
    monthsSchoolRequestsForgiveness: 'Months the School Requests Forgiveness',
    disbursalDateRequested: 'Disbursal Date Requested',
    tenPercentDownOnVehicleOrLandFinancing:
      '10% Down on Vehicle or Land Financing?',
    createdBy: 'Created By',
  };

  convertSheetDataToDb(sheetData: any) {
    const dbData: any = {};
    Object.keys(this.dbToSheetMapping).forEach((dbKey) => {
      const sheetKey = this.dbToSheetMapping[dbKey];
      if (sheetData[sheetKey] !== undefined) {
        dbData[dbKey] = sheetData[sheetKey];
      }
    });
    return dbData;
  }

  convertDbDataToSheet(dbData: any) {
    const sheetData: any = {};
    Object.keys(this.sheetToDbMapping).forEach((sheetKey) => {
      const dbKey = this.sheetToDbMapping[sheetKey];
      if (dbData[dbKey] !== undefined) {
        sheetData[sheetKey] = dbData[dbKey];
      }
    });
    return sheetData;
  }
}
