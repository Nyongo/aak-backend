import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HomeVisitDbService {
  private readonly logger = new Logger(HomeVisitDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.homeVisit.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error finding all home visits:', error);
      throw error;
    }
  }

  async findByCreditApplicationId(creditApplicationId: string) {
    try {
      return await this.prisma.homeVisit.findMany({
        where: { creditApplicationId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding home visits by credit application ID ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  async findUnsynced() {
    try {
      return await this.prisma.homeVisit.findMany({
        where: { synced: false },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error finding unsynced home visits:', error);
      throw error;
    }
  }

  async findSynced() {
    try {
      return await this.prisma.homeVisit.findMany({
        where: { synced: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error finding synced home visits:', error);
      throw error;
    }
  }

  async findById(id: string) {
    try {
      return await this.prisma.homeVisit.findUnique({
        where: { id: parseInt(id) },
      });
    } catch (error) {
      this.logger.error(`Error finding home visit by ID ${id}:`, error);
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.homeVisit.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(
        `Error finding home visit by sheet ID ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async create(data: any) {
    try {
      return await this.prisma.homeVisit.create({
        data: data, // Data is already in database format
      });
    } catch (error) {
      this.logger.error('Error creating home visit:', error);
      throw error;
    }
  }

  async update(sheetId: string, data: any) {
    try {
      return await this.prisma.homeVisit.update({
        where: { sheetId },
        data: this.convertSheetDataToDb(data),
      });
    } catch (error) {
      this.logger.error(`Error updating home visit ${sheetId}:`, error);
      throw error;
    }
  }

  async updateById(id: number, data: any) {
    try {
      return await this.prisma.homeVisit.update({
        where: { id },
        data: data, // Data is already in database format
      });
    } catch (error) {
      this.logger.error(`Error updating home visit by id ${id}:`, error);
      throw error;
    }
  }

  async updateSyncStatus(id: number, synced: boolean) {
    try {
      return await this.prisma.homeVisit.update({
        where: { id },
        data: { synced },
      });
    } catch (error) {
      this.logger.error(
        `Error updating sync status for home visit ${id}:`,
        error,
      );
      throw error;
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.homeVisit.delete({
        where: { id: parseInt(id) },
      });
    } catch (error) {
      this.logger.error(`Error deleting home visit ${id}:`, error);
      throw error;
    }
  }

  // Mapping between database fields and Google Sheets columns
  private sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'User ID': 'userId',
    County: 'county',
    'Address Details ': 'addressDetails',
    'Location Pin': 'locationPin',
    'Own or Rent': 'ownOrRent',
    'How many years have they stayed there?': 'howManyYearsStayed',
    'Marital Status': 'maritalStatus',
    'How many children does the director have?': 'howManyChildren',
    'Is the spouse involved in running school?': 'isSpouseInvolvedInSchool',
    'Does the spouse have other income?': 'doesSpouseHaveOtherIncome',
    'If yes, how much per month? ': 'ifYesHowMuchPerMonth',
    'Is the director behind on any utility bills at home? ':
      'isDirectorBehindOnUtilityBills',
    'What is the total number of rooms in house? (Include all types of rooms) ':
      'totalNumberOfRooms',
    'How is the neighborhood? Provide general comments.': 'howIsNeighborhood',
    'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? ':
      'howAccessibleIsHouse',
    "Is the director's home in the same city as their school? ":
      'isDirectorHomeInSameCity',
    'Is the director a trained educator?': 'isDirectorTrainedEducator',
    'Does the director have another profitable business?':
      'doesDirectorHaveOtherBusiness',
    'Other Notes': 'otherNotes',
  };

  private dbToSheetMapping = {
    sheetId: 'ID',
    creditApplicationId: 'Credit Application ID',
    userId: 'User ID',
    county: 'County',
    addressDetails: 'Address Details ',
    locationPin: 'Location Pin',
    ownOrRent: 'Own or Rent',
    howManyYearsStayed: 'How many years have they stayed there?',
    maritalStatus: 'Marital Status',
    howManyChildren: 'How many children does the director have?',
    isSpouseInvolvedInSchool: 'Is the spouse involved in running school?',
    doesSpouseHaveOtherIncome: 'Does the spouse have other income?',
    ifYesHowMuchPerMonth: 'If yes, how much per month? ',
    isDirectorBehindOnUtilityBills:
      'Is the director behind on any utility bills at home? ',
    totalNumberOfRooms:
      'What is the total number of rooms in house? (Include all types of rooms) ',
    howIsNeighborhood: 'How is the neighborhood? Provide general comments.',
    howAccessibleIsHouse:
      'How accessible is the house in case of default? Were there a lot of gates in neighborhood/home? ',
    isDirectorHomeInSameCity:
      "Is the director's home in the same city as their school? ",
    isDirectorTrainedEducator: 'Is the director a trained educator?',
    doesDirectorHaveOtherBusiness:
      'Does the director have another profitable business?',
    otherNotes: 'Other Notes',
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
