import { Injectable, Logger } from '@nestjs/common';
import { MpesaBankStatementDbService } from './mpesa-bank-statement-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class MpesaBankStatementSyncService {
  private readonly logger = new Logger(MpesaBankStatementSyncService.name);

  constructor(
    private readonly mpesaBankStatementDbService: MpesaBankStatementDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all mpesa bank statements to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log('Syncing all mpesa bank statements to Google Sheets');

    try {
      const mpesaBankStatements =
        await this.mpesaBankStatementDbService.findAll();

      if (mpesaBankStatements.length === 0) {
        return {
          success: true,
          message: 'No mpesa bank statements found to sync',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const mpesaBankStatement of mpesaBankStatements) {
        try {
          await this.syncMpesaBankStatementById(mpesaBankStatement.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync mpesa bank statement ${mpesaBankStatement.id}: ${error}`,
          );
        }
      }

      return {
        success: true,
        message: `Sync completed: ${synced} synced, ${errors} errors`,
        synced,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync all mpesa bank statements: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single mpesa bank statement to Google Sheets
   */
  async syncMpesaBankStatementToSheet(mpesaBankStatement: any) {
    const creditApplicationId = mpesaBankStatement['Credit Application'];
    const sheetId = mpesaBankStatement.sheetId || mpesaBankStatement.ID;

    this.logger.debug(`Syncing mpesa bank statement:`, {
      creditApplicationId,
      sheetId,
      dbId: mpesaBankStatement.dbId,
      synced: mpesaBankStatement.synced,
    });

    if (!creditApplicationId) {
      throw new Error(
        'Mpesa bank statement has no Credit Application for identification',
      );
    }

    // If sheetId exists (from DB), always try to update existing record first
    if (sheetId) {
      try {
        this.logger.debug(
          `Attempting to update existing mpesa bank statement in sheet by sheetId: ${sheetId}`,
        );
        await this.sheetsService.updateMpesaBankStatement(
          sheetId,
          mpesaBankStatement,
        );
        this.logger.debug(
          `Updated existing mpesa bank statement in sheet: ${creditApplicationId} (sheetId: ${sheetId})`,
        );

        // Update the Postgres record to mark as synced
        if (mpesaBankStatement.dbId) {
          await this.mpesaBankStatementDbService.updateSyncStatus(
            mpesaBankStatement.dbId,
            true,
          );
          this.logger.debug(
            `Marked Postgres record ${mpesaBankStatement.dbId} as synced`,
          );
        }

        return; // Successfully updated, exit
      } catch (error) {
        this.logger.warn(
          `Failed to update by sheetId ${sheetId}, will try to add new record: ${error}`,
        );
        // Continue to add new record if update fails
      }
    }

    // If no sheetId or update failed, add new record
    this.logger.debug(
      `Adding new mpesa bank statement to sheet: ${creditApplicationId}`,
    );

    try {
      const newSheetId =
        await this.sheetsService.addMpesaBankStatement(mpesaBankStatement);
      this.logger.debug(
        `Added new mpesa bank statement to sheet: ${creditApplicationId} (new sheetId: ${newSheetId})`,
      );

      // Update the Postgres record with the new sheetId and mark as synced
      if (mpesaBankStatement.dbId) {
        await this.mpesaBankStatementDbService.update(
          sheetId || '', // Use existing sheetId if available, otherwise empty
          { sheetId: newSheetId, synced: true },
        );
        this.logger.debug(
          `Updated Postgres record ${mpesaBankStatement.dbId} with new sheetId: ${newSheetId}`,
        );
      }

      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to add mpesa bank statement to sheet: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Sync a single mpesa bank statement by database ID
   */
  async syncMpesaBankStatementById(
    dbId: number,
    operation?: 'create' | 'update',
  ) {
    this.logger.log(
      `Syncing single mpesa bank statement by database ID: ${dbId} (operation: ${operation || 'unknown'})`,
    );

    try {
      // Always fetch the latest data from the database to ensure we have the most recent data
      const mpesaBankStatement =
        await this.mpesaBankStatementDbService.findById(dbId.toString());
      if (!mpesaBankStatement) {
        throw new Error(
          `Mpesa bank statement with database ID ${dbId} not found`,
        );
      }

      // Convert to sheet format and add database ID
      const mpesaBankStatementInSheetFormat =
        this.mpesaBankStatementDbService.convertDbToSheet(mpesaBankStatement);
      (mpesaBankStatementInSheetFormat as any).dbId = dbId;
      (mpesaBankStatementInSheetFormat as any).operation = operation;

      // Sync to sheet
      await this.syncMpesaBankStatementToSheet(mpesaBankStatementInSheetFormat);

      this.logger.log(
        `Successfully synced mpesa bank statement ${dbId} to Google Sheets`,
      );

      return {
        success: true,
        message: `Mpesa bank statement ${dbId} synced successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync mpesa bank statement ${dbId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync mpesa bank statements by credit application ID
   */
  async syncByCreditApplicationId(creditApplicationId: string) {
    this.logger.log(
      `Syncing mpesa bank statements by credit application ID: ${creditApplicationId}`,
    );

    try {
      const mpesaBankStatements =
        await this.mpesaBankStatementDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (mpesaBankStatements.length === 0) {
        return {
          success: true,
          message: 'No mpesa bank statements found for this credit application',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const mpesaBankStatement of mpesaBankStatements) {
        try {
          await this.syncMpesaBankStatementById(mpesaBankStatement.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync mpesa bank statement ${mpesaBankStatement.id}: ${error}`,
          );
        }
      }

      return {
        success: true,
        message: `Sync completed: ${synced} synced, ${errors} errors`,
        synced,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync mpesa bank statements for credit application ${creditApplicationId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if a sheetId exists in Google Sheets
   */
  private async checkSheetIdExists(sheetId: string): Promise<boolean> {
    try {
      const mpesaBankStatements =
        await this.sheetsService.getMpesaBankStatements();
      const exists = mpesaBankStatements.some(
        (mpesaBankStatement) => mpesaBankStatement.ID === sheetId,
      );
      this.logger.debug(
        `Checking if sheetId ${sheetId} exists in sheets: ${exists}`,
      );
      return exists;
    } catch (error) {
      this.logger.error(`Error checking if sheetId exists: ${error}`);
      return false;
    }
  }

  /**
   * Find mpesa bank statement by sheet ID in Google Sheets
   */
  private async findMpesaBankStatementBySheetId(sheetId: string): Promise<any> {
    try {
      const mpesaBankStatements =
        await this.sheetsService.getMpesaBankStatements();
      return (
        mpesaBankStatements.find(
          (mpesaBankStatement) => mpesaBankStatement.ID === sheetId,
        ) || null
      );
    } catch (error) {
      this.logger.error(
        `Error finding mpesa bank statement by sheetId: ${error}`,
      );
      return null;
    }
  }

  /**
   * Find existing mpesa bank statement in Google Sheets by creditApplicationId
   * This method is used when we have a synced record with a temporary sheetId
   * and need to find the real Google Sheets record to update it
   */
  private async findExistingMpesaBankStatementInSheets(
    creditApplicationId: string,
  ): Promise<any> {
    try {
      const mpesaBankStatements =
        await this.sheetsService.getMpesaBankStatements();

      // Log all mpesa bank statements for debugging
      this.logger.debug(
        `Searching through ${mpesaBankStatements.length} mpesa bank statements in sheets for creditApplicationId: ${creditApplicationId}`,
      );

      // Log all records to see what we're working with
      mpesaBankStatements.forEach((record, index) => {
        this.logger.debug(
          `Record ${index}: ID=${record.ID}, Credit Application=${record['Credit Application']}, Type=${record.Type}`,
        );
      });

      // Find the most recent record for this credit application
      // We'll use the first match we find (most recent based on Created At)
      const existingRecord = mpesaBankStatements.find(
        (mpesaBankStatement) =>
          mpesaBankStatement['Credit Application'] === creditApplicationId,
      );

      if (existingRecord) {
        this.logger.debug(
          `Found existing mpesa bank statement in sheets for creditApplicationId ${creditApplicationId}: ${existingRecord.ID}`,
        );
        return existingRecord;
      }

      this.logger.debug(
        `No existing mpesa bank statement found in sheets for creditApplicationId: ${creditApplicationId}`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error finding existing mpesa bank statement:`, error);
      return null;
    }
  }
}
