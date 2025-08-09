import { Injectable, Logger } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { CreditApplicationCommentsDbService } from './credit-application-comments-db.service';

@Injectable()
export class CreditApplicationCommentsSyncService {
  private readonly logger = new Logger(
    CreditApplicationCommentsSyncService.name,
  );

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly creditApplicationCommentsDbService: CreditApplicationCommentsDbService,
  ) {}

  async syncAllToSheets(): Promise<void> {
    try {
      const unsyncedComments =
        await this.creditApplicationCommentsDbService.findUnsynced();
      this.logger.log(
        `Syncing ${unsyncedComments.length} unsynced comments to sheets`,
      );

      for (const comment of unsyncedComments) {
        await this.syncCreditApplicationCommentToSheet(comment, 'create');
      }
    } catch (error) {
      this.logger.error('Error syncing all comments to sheets:', error);
      throw error;
    }
  }

  async syncCreditApplicationCommentToSheet(
    commentData: any,
    operation: 'create' | 'update' = 'create',
  ): Promise<void> {
    try {
      // Handle both database record format and sheet format
      // For database records, use sheetId as the identifier
      const identifier =
        commentData.ID || commentData.sheetId || commentData.id;

      this.logger.debug('Sync service received commentData:', commentData);
      this.logger.debug('Identifier extracted:', identifier);

      // Convert database record to sheet format if needed
      const sheetData = commentData.ID
        ? commentData
        : {
            ID: commentData.sheetId, // Use sheetId as ID for Google Sheets
            'Credit Application ID': commentData.creditApplicationId,
            'Commenter Type': commentData.commenterType,
            Comments: commentData.comments,
            'Commenter Name': commentData.commenterName,
            'Created At': commentData.createdAt,
          };

      this.logger.debug('Sheet data prepared:', sheetData);

      const { ID, ...dataWithoutId } = sheetData;

      this.logger.debug(
        `Syncing comment ${identifier} to sheets with operation: ${operation}`,
      );

      if (operation === 'update') {
        // For updates, find existing record and update it
        const existingRecord =
          await this.findExistingCreditApplicationCommentInSheets(identifier);
        if (existingRecord) {
          await this.sheetsService.updateCreditApplicationComment(
            identifier,
            dataWithoutId,
          );
          this.logger.debug(`Updated comment ${identifier} in sheets`);
        } else {
          this.logger.warn(
            `Comment ${identifier} not found in sheets for update, creating new record`,
          );
          await this.sheetsService.addCreditApplicationComment(sheetData);
          this.logger.debug(`Created comment ${identifier} in sheets`);
        }
      } else {
        // For creates, always add new record
        await this.sheetsService.addCreditApplicationComment(sheetData);
        this.logger.debug(`Created comment ${identifier} in sheets`);
      }

      // Mark as synced in database using the database ID
      if (commentData.id) {
        await this.creditApplicationCommentsDbService.updateSyncStatus(
          commentData.id,
          true,
        );
        this.logger.debug(`Marked comment ${commentData.id} as synced`);
      }
    } catch (error) {
      this.logger.error(`Error syncing comment to sheets:`, error);
      throw error;
    }
  }

  async syncCreditApplicationCommentById(
    id: number,
    operation: 'create' | 'update' = 'create',
  ): Promise<void> {
    try {
      const comment =
        await this.creditApplicationCommentsDbService.findById(id);
      if (!comment) {
        throw new Error(`Comment with ID ${id} not found`);
      }

      this.logger.debug('Database record fetched for sync:', comment);

      await this.syncCreditApplicationCommentToSheet(comment, operation);
    } catch (error) {
      this.logger.error(`Error syncing comment ${id}:`, error);
      throw error;
    }
  }

  async syncByCreditApplicationId(creditApplicationId: string): Promise<void> {
    try {
      const comments =
        await this.creditApplicationCommentsDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      for (const comment of comments) {
        await this.syncCreditApplicationCommentToSheet(comment, 'create');
      }
    } catch (error) {
      this.logger.error(
        `Error syncing comments for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  private async findExistingCreditApplicationCommentInSheets(
    identifier: string,
  ): Promise<any | null> {
    try {
      if (!identifier) {
        this.logger.debug('No identifier provided for search');
        return null;
      }

      const records = await this.sheetsService.getCreditApplicationComments();
      this.logger.debug(`Found ${records.length} records in sheets`);
      this.logger.debug(`Looking for identifier: ${identifier}`);

      if (records.length > 0) {
        this.logger.debug(`First record structure:`, records[0]);
        this.logger.debug(
          `Available IDs in records:`,
          records.map((r) => r.ID).slice(0, 5),
        );
        const similarRecords = records.filter(
          (r) => r.ID && r.ID.includes(identifier.substring(0, 10)),
        );
        if (similarRecords.length > 0) {
          this.logger.debug(
            `Found similar records:`,
            similarRecords.map((r) => r.ID),
          );
        }
      }

      const existingRecord = records.find((record) => record.ID === identifier);
      if (existingRecord) {
        this.logger.debug(
          `Found existing record for identifier: ${identifier}`,
        );
        return existingRecord;
      }

      this.logger.debug(
        `No existing record found for identifier: ${identifier}`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error finding existing comment in sheets:`, error);
      return null;
    }
  }
}
