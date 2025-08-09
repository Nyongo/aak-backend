import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CreditApplicationCommentsDbService {
  private readonly logger = new Logger(CreditApplicationCommentsDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Mapping from Google Sheets column names to database field names
  private sheetToDbMapping = {
    ID: 'sheetId', // Map ID to sheetId for database storage
    'Credit Application ID': 'creditApplicationId',
    'Commenter Type': 'commenterType',
    Comments: 'comments',
    'Commenter Name': 'commenterName',
    // Note: 'Created At' is not mapped as it's handled by database default
  };

  // Mapping from database field names to Google Sheets column names
  private dbToSheetMapping = {
    sheetId: 'ID',
    creditApplicationId: 'Credit Application ID',
    commenterType: 'Commenter Type',
    comments: 'Comments',
    commenterName: 'Commenter Name',
    createdAt: 'Created At',
    synced: 'Synced',
  };

  private convertSheetDataToDb(sheetData: any): any {
    this.logger.debug('Converting sheet data to DB format:', sheetData);
    const dbData: any = {};
    for (const [sheetKey, dbKey] of Object.entries(this.sheetToDbMapping)) {
      if (sheetData[sheetKey] !== undefined) {
        dbData[dbKey] = sheetData[sheetKey];
      }
    }
    // Handle sheetId field if it exists in the input data
    if (sheetData.sheetId !== undefined) {
      dbData.sheetId = sheetData.sheetId;
      this.logger.debug('Added sheetId to dbData:', sheetData.sheetId);
    }
    this.logger.debug('Final dbData:', dbData);
    return dbData;
  }

  private convertDbDataToSheet(dbData: any): any {
    const sheetData: any = {};
    for (const [dbKey, sheetKey] of Object.entries(this.dbToSheetMapping)) {
      if (dbData[dbKey] !== undefined) {
        sheetData[sheetKey] = dbData[dbKey];
      }
    }
    return sheetData;
  }

  async findAll(): Promise<any[]> {
    try {
      const comments = await this.prisma.creditApplicationComment.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return comments.map((comment) => this.convertDbDataToSheet(comment));
    } catch (error) {
      this.logger.error(
        'Error fetching all credit application comments:',
        error,
      );
      throw error;
    }
  }

  async findByCreditApplicationId(creditApplicationId: string): Promise<any[]> {
    try {
      const comments = await this.prisma.creditApplicationComment.findMany({
        where: { creditApplicationId },
        orderBy: { createdAt: 'desc' },
      });
      return comments.map((comment) => this.convertDbDataToSheet(comment));
    } catch (error) {
      this.logger.error(
        `Error fetching comments for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  async findUnsynced(): Promise<any[]> {
    try {
      const comments = await this.prisma.creditApplicationComment.findMany({
        where: { synced: false },
      });
      return comments.map((comment) => this.convertDbDataToSheet(comment));
    } catch (error) {
      this.logger.error('Error fetching unsynced comments:', error);
      throw error;
    }
  }

  async findSynced(): Promise<any[]> {
    try {
      const comments = await this.prisma.creditApplicationComment.findMany({
        where: { synced: true },
      });
      return comments.map((comment) => this.convertDbDataToSheet(comment));
    } catch (error) {
      this.logger.error('Error fetching synced comments:', error);
      throw error;
    }
  }

  async findById(id: number): Promise<any> {
    try {
      const comment = await this.prisma.creditApplicationComment.findUnique({
        where: { id },
      });
      // Return the raw database record for sync service to use
      return comment;
    } catch (error) {
      this.logger.error(`Error fetching comment ${id}:`, error);
      throw error;
    }
  }

  async findBySheetId(sheetId: string): Promise<any> {
    try {
      const comment = await this.prisma.creditApplicationComment.findUnique({
        where: { sheetId },
      });
      return comment ? this.convertDbDataToSheet(comment) : null;
    } catch (error) {
      this.logger.error(`Error fetching comment by sheetId ${sheetId}:`, error);
      throw error;
    }
  }

  async create(data: any): Promise<any> {
    try {
      this.logger.debug('Creating comment with data:', data);
      const dbData = this.convertSheetDataToDb(data);
      this.logger.debug('Converted to database format:', dbData);
      const comment = await this.prisma.creditApplicationComment.create({
        data: dbData,
      });
      this.logger.debug('Created comment in database:', comment);
      // Return the raw database record so we can access the id field
      return comment;
    } catch (error) {
      this.logger.error('Error creating credit application comment:', error);
      throw error;
    }
  }

  async update(sheetId: string, data: any): Promise<any> {
    try {
      const dbData = this.convertSheetDataToDb(data);
      const comment = await this.prisma.creditApplicationComment.update({
        where: { sheetId },
        data: dbData,
      });
      return this.convertDbDataToSheet(comment);
    } catch (error) {
      this.logger.error(`Error updating comment ${sheetId}:`, error);
      throw error;
    }
  }

  async updateById(id: number, data: any): Promise<any> {
    try {
      const comment = await this.prisma.creditApplicationComment.update({
        where: { id },
        data,
      });
      return this.convertDbDataToSheet(comment);
    } catch (error) {
      this.logger.error(`Error updating comment by ID ${id}:`, error);
      throw error;
    }
  }

  async updateSyncStatus(id: number, synced: boolean): Promise<void> {
    try {
      await this.prisma.creditApplicationComment.update({
        where: { id },
        data: { synced },
      });
    } catch (error) {
      this.logger.error(`Error updating sync status for comment ${id}:`, error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.creditApplicationComment.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting comment ${id}:`, error);
      throw error;
    }
  }
}
