import { Injectable, Logger } from '@nestjs/common';
import { AuditedFinancialsDbService } from './audited-financials-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class AuditedFinancialsSyncService {
  private readonly logger = new Logger(AuditedFinancialsSyncService.name);

  constructor(
    private readonly auditedFinancialsDbService: AuditedFinancialsDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all audited financials to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log('Syncing all audited financials to Google Sheets');

    try {
      const auditedFinancials = await this.auditedFinancialsDbService.findAll();

      if (auditedFinancials.length === 0) {
        return {
          success: true,
          message: 'No audited financials found to sync',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const auditedFinancial of auditedFinancials) {
        try {
          await this.syncAuditedFinancialById(auditedFinancial.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync audited financial ${auditedFinancial.id}: ${error}`,
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
        `Failed to sync all audited financials: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single audited financial to Google Sheets
   */
  async syncAuditedFinancialToSheet(auditedFinancial: any) {
    const creditApplicationId = auditedFinancial['Credit Application ID'];
    const sheetId = auditedFinancial.sheetId || auditedFinancial.ID;

    this.logger.debug(`Syncing audited financial:`, {
      creditApplicationId,
      sheetId,
      dbId: auditedFinancial.dbId,
      synced: auditedFinancial.synced,
    });

    if (!creditApplicationId) {
      throw new Error(
        'Audited financial has no Credit Application ID for identification',
      );
    }

    // Check if sheetId exists and is not null - all sheetIds are permanent IDs
    const isValidSheetId = sheetId && sheetId !== null;

    // 1. If sheetId exists, check if it exists in sheets before updating
    if (isValidSheetId) {
      const sheetIdExists = await this.checkSheetIdExists(sheetId);

      if (sheetIdExists) {
        try {
          this.logger.debug(
            `Updating audited financial in sheet by sheetId: ${sheetId}`,
          );
          await this.sheetsService.updateAuditedFinancial(
            sheetId,
            auditedFinancial,
          );
          this.logger.debug(
            `Updated audited financial in sheet: ${creditApplicationId} (sheetId: ${sheetId})`,
          );

          // Update the Postgres record to mark as synced
          if (auditedFinancial.dbId) {
            await this.auditedFinancialsDbService.updateSyncStatus(
              auditedFinancial.dbId,
              true,
            );
            this.logger.debug(
              `Marked Postgres record ${auditedFinancial.dbId} as synced`,
            );
          }

          return; // Successfully updated, exit
        } catch (error) {
          this.logger.error(
            `Failed to update by sheetId ${sheetId}: ${error}. This should not happen for valid sheetIds.`,
          );
          throw error;
        }
      } else {
        this.logger.warn(
          `SheetId ${sheetId} exists in Postgres but not found in Google Sheets. Creating new record.`,
        );
        // Fall through to create new record
      }
    }

    // 2. If no valid sheetId, this is a new record - create it
    this.logger.debug(
      `No valid sheetId found, creating new audited financial:`,
      {
        creditApplicationId,
        sheetId,
        dbId: auditedFinancial.dbId,
      },
    );

    try {
      const newSheetId =
        await this.sheetsService.addAuditedFinancial(auditedFinancial);
      this.logger.debug(
        `Added new audited financial to sheet: ${creditApplicationId} (new sheetId: ${newSheetId})`,
      );

      // Update the Postgres record with the new sheetId and mark as synced
      if (auditedFinancial.dbId) {
        await this.auditedFinancialsDbService.updateSheetIdAndSyncStatus(
          auditedFinancial.dbId,
          newSheetId,
          true,
        );
        this.logger.debug(
          `Updated Postgres record ${auditedFinancial.dbId} with new sheetId: ${newSheetId} and marked as synced`,
        );
      }

      return;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to add audited financial to sheet: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Sync a single audited financial by database ID
   */
  async syncAuditedFinancialById(
    dbId: number,
    operation?: 'create' | 'update',
  ) {
    this.logger.log(
      `Syncing single audited financial by database ID: ${dbId} (operation: ${operation || 'unknown'})`,
    );

    try {
      // Always fetch the latest data from the database to ensure we have the most recent data
      const auditedFinancial = await this.auditedFinancialsDbService.findById(
        dbId.toString(),
      );
      if (!auditedFinancial) {
        throw new Error(`Audited financial with database ID ${dbId} not found`);
      }

      // Convert to sheet format and add database ID
      const auditedFinancialInSheetFormat =
        this.auditedFinancialsDbService.convertDbToSheet(auditedFinancial);
      (auditedFinancialInSheetFormat as any).dbId = dbId;
      (auditedFinancialInSheetFormat as any).operation = operation;

      // Sync to sheet
      await this.syncAuditedFinancialToSheet(auditedFinancialInSheetFormat);

      this.logger.log(
        `Successfully synced audited financial ${dbId} to Google Sheets`,
      );

      return {
        success: true,
        message: `Audited financial ${dbId} synced successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync audited financial ${dbId}: ${errorMessage}`,
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
      const auditedFinancials = await this.sheetsService.getAuditedFinancials();
      const exists = auditedFinancials.some(
        (auditedFinancial) => auditedFinancial.ID === sheetId,
      );
      this.logger.debug(
        `Checking if sheetId ${sheetId} exists in sheets: ${exists}`,
      );
      return exists;
    } catch (error) {
      this.logger.error(`Error checking if sheetId ${sheetId} exists:`, error);
      return false;
    }
  }

  /**
   * Sync audited financials by credit application ID
   */
  async syncByCreditApplicationId(creditApplicationId: string) {
    this.logger.log(
      `Syncing audited financials by credit application ID: ${creditApplicationId}`,
    );

    try {
      const auditedFinancials =
        await this.auditedFinancialsDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (auditedFinancials.length === 0) {
        return {
          success: true,
          message: 'No audited financials found for this credit application',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const auditedFinancial of auditedFinancials) {
        try {
          await this.syncAuditedFinancialById(auditedFinancial.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync audited financial ${auditedFinancial.id}: ${error}`,
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
        `Failed to sync audited financials for credit application ${creditApplicationId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Find audited financial by sheet ID in Google Sheets
   */
  private async findAuditedFinancialBySheetId(sheetId: string): Promise<any> {
    try {
      const auditedFinancials = await this.sheetsService.getAuditedFinancials();
      return (
        auditedFinancials.find(
          (auditedFinancial) => auditedFinancial.ID === sheetId,
        ) || null
      );
    } catch (error) {
      this.logger.error(`Error finding audited financial by sheetId: ${error}`);
      return null;
    }
  }

  /**
   * Find existing audited financial in Google Sheets by creditApplicationId
   * This method is used when we have a synced record with a temporary sheetId
   * and need to find the real Google Sheets record to update it
   */
  private async findExistingAuditedFinancialInSheets(
    creditApplicationId: string,
  ): Promise<any> {
    try {
      const auditedFinancials = await this.sheetsService.getAuditedFinancials();

      // Log all audited financials for debugging
      this.logger.debug(
        `Searching through ${auditedFinancials.length} audited financials in sheets for creditApplicationId: ${creditApplicationId}`,
      );

      // Log all records to see what we're working with
      auditedFinancials.forEach((record, index) => {
        this.logger.debug(
          `Record ${index}: ID=${record.ID}, Credit Application ID=${record['Credit Application ID']}, Statement Type=${record['Statement Type']}`,
        );
      });

      // Find the most recent record for this credit application
      // We'll use the first match we find (most recent based on Created At)
      const existingRecord = auditedFinancials.find(
        (auditedFinancial) =>
          auditedFinancial['Credit Application ID'] === creditApplicationId,
      );

      if (existingRecord) {
        this.logger.debug(
          `Found existing audited financial in sheets for creditApplicationId ${creditApplicationId}: ${existingRecord.ID}`,
        );
        return existingRecord;
      }

      this.logger.debug(
        `No existing audited financial found in sheets for creditApplicationId: ${creditApplicationId}`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error finding existing audited financial:`, error);
      return null;
    }
  }
}
