import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssetTitleDbService {
  private readonly logger = new Logger(AssetTitleDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.assetTitle.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error finding all asset titles:', error);
      throw error;
    }
  }

  async findByCreditApplicationId(creditApplicationId: string) {
    try {
      return await this.prisma.assetTitle.findMany({
        where: { creditApplicationId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding asset titles by credit application ID ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  async findUnsynced() {
    try {
      return await this.prisma.assetTitle.findMany({
        where: { synced: false },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error finding unsynced asset titles:', error);
      throw error;
    }
  }

  async findSynced() {
    try {
      return await this.prisma.assetTitle.findMany({
        where: { synced: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error finding synced asset titles:', error);
      throw error;
    }
  }

  async findById(id: string) {
    try {
      return await this.prisma.assetTitle.findUnique({
        where: { id: parseInt(id) },
      });
    } catch (error) {
      this.logger.error(`Error finding asset title by ID ${id}:`, error);
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.assetTitle.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(
        `Error finding asset title by sheet ID ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async create(data: any) {
    try {
      return await this.prisma.assetTitle.create({
        data: data, // Data is already in database format
      });
    } catch (error) {
      this.logger.error('Error creating asset title:', error);
      throw error;
    }
  }

  async update(sheetId: string, data: any) {
    try {
      return await this.prisma.assetTitle.update({
        where: { sheetId },
        data: this.convertSheetDataToDb(data),
      });
    } catch (error) {
      this.logger.error(`Error updating asset title ${sheetId}:`, error);
      throw error;
    }
  }

  async updateById(id: number, data: any) {
    try {
      return await this.prisma.assetTitle.update({
        where: { id },
        data: data, // Data is already in database format
      });
    } catch (error) {
      this.logger.error(`Error updating asset title by id ${id}:`, error);
      throw error;
    }
  }

  async updateSyncStatus(id: number, synced: boolean) {
    try {
      return await this.prisma.assetTitle.update({
        where: { id },
        data: { synced },
      });
    } catch (error) {
      this.logger.error(
        `Error updating sync status for asset title ${id}:`,
        error,
      );
      throw error;
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.assetTitle.delete({
        where: { id: parseInt(id) },
      });
    } catch (error) {
      this.logger.error(`Error deleting asset title ${id}:`, error);
      throw error;
    }
  }

  // Mapping between database fields and Google Sheets columns
  private sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    Type: 'type',
    'To Be Used As Security?': 'toBeUsedAsSecurity',
    Description: 'description',
    'Legal Owner': 'legalOwner',
    'User ID': 'userId',
    'Full Owner Details': 'fullOwnerDetails',
    'Collateral owned by director of school?':
      'collateralOwnedByDirectorOfSchool',
    'Plot Number': 'plotNumber',
    'School sits on land?': 'schoolSitsOnLand',
    'Has Comprehensive Insurance': 'hasComprehensiveInsurance',
    'Original Insurance Coverage': 'originalInsuranceCoverage',
    'Initial Estimated Value (KES)': 'initialEstimatedValue',
    'Approved by Legal Team or NTSA Agent for use as Security?':
      'approvedByLegalTeamOrNTSAAgent',
    'Notes on Approval for Use': 'notesOnApprovalForUse',
    "Evaluator's Market Value": 'evaluatorsMarketValue',
    "Evaluator's Forced Value": 'evaluatorsForcedValue',
    'Money Owed on Asset (If Any)': 'moneyOwedOnAsset',
    'License Plate Number': 'licensePlateNumber',
    'Engine CC': 'engineCC',
    'Year of Manufacture': 'yearOfManufacture',
    'Logbook Photo': 'logbookPhoto',
    'Title Deed Photo': 'titleDeedPhoto',
    'Full Title Deed': 'fullTitleDeed',
    "Evaluator's Report": 'evaluatorsReport',
  };

  private dbToSheetMapping = {
    sheetId: 'ID',
    creditApplicationId: 'Credit Application ID',
    type: 'Type',
    toBeUsedAsSecurity: 'To Be Used As Security?',
    description: 'Description',
    legalOwner: 'Legal Owner',
    userId: 'User ID',
    fullOwnerDetails: 'Full Owner Details',
    collateralOwnedByDirectorOfSchool:
      'Collateral owned by director of school?',
    plotNumber: 'Plot Number',
    schoolSitsOnLand: 'School sits on land?',
    hasComprehensiveInsurance: 'Has Comprehensive Insurance',
    originalInsuranceCoverage: 'Original Insurance Coverage',
    initialEstimatedValue: 'Initial Estimated Value (KES)',
    approvedByLegalTeamOrNTSAAgent:
      'Approved by Legal Team or NTSA Agent for use as Security?',
    notesOnApprovalForUse: 'Notes on Approval for Use',
    evaluatorsMarketValue: "Evaluator's Market Value",
    evaluatorsForcedValue: "Evaluator's Forced Value",
    moneyOwedOnAsset: 'Money Owed on Asset (If Any)',
    licensePlateNumber: 'License Plate Number',
    engineCC: 'Engine CC',
    yearOfManufacture: 'Year of Manufacture',
    logbookPhoto: 'Logbook Photo',
    titleDeedPhoto: 'Title Deed Photo',
    fullTitleDeed: 'Full Title Deed',
    evaluatorsReport: "Evaluator's Report",
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
