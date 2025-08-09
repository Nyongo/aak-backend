import { Injectable, Logger } from '@nestjs/common';
import { ActiveDebtsDbService } from './active-debts-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class ActiveDebtsSyncService {
  private readonly logger = new Logger(ActiveDebtsSyncService.name);

  constructor(
    private readonly activeDebtsDbService: ActiveDebtsDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all active debts from Postgres to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log(
      'Starting sync of all active debts from Postgres to Google Sheets',
    );

    try {
      // Get all active debts from Postgres
      const activeDebts = await this.activeDebtsDbService.findAll();
      this.logger.log(`Found ${activeDebts.length} active debts in Postgres`);

      if (activeDebts.length === 0) {
        return {
          success: true,
          message: 'No active debts to sync',
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const activeDebtsInSheetFormat =
        this.activeDebtsDbService.convertDbArrayToSheet(activeDebts);

      // Add database IDs to the active debt data for sync service
      activeDebtsInSheetFormat.forEach((activeDebt, index) => {
        (activeDebt as any).dbId = activeDebts[index].id;
      });

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each active debt
      for (const activeDebt of activeDebtsInSheetFormat) {
        try {
          await this.syncActiveDebtToSheet(activeDebt);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            activeDebt:
              activeDebt['Credit Application ID'] ||
              activeDebt['Debt Status'] ||
              'Unknown',
            creditApplicationId: activeDebt['Credit Application ID'],
            debtStatus: activeDebt['Debt Status'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync active debt ${activeDebt['Credit Application ID'] || activeDebt['Debt Status']}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(`Sync completed: ${synced} synced, ${errors} errors`);

      return {
        success: true,
        message: `Sync completed: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails,
        total: activeDebts.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync active debts: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single active debt to Google Sheets
   */
  async syncActiveDebtToSheet(activeDebt: any) {
    const creditApplicationId = activeDebt['Credit Application ID'];
    const debtStatus = activeDebt['Debt Status'];
    const sheetId = activeDebt.sheetId || activeDebt.ID;

    this.logger.debug(`Syncing active debt:`, {
      creditApplicationId,
      debtStatus,
      sheetId,
      isValidSheetId: sheetId && sheetId !== null && !sheetId.startsWith('AD-'),
      hasTemporarySheetId: sheetId && sheetId.startsWith('AD-'),
      dbId: activeDebt.dbId,
    });

    // Log the full active debt object for debugging
    this.logger.debug(`Full active debt object:`, activeDebt);

    if (!creditApplicationId && !debtStatus) {
      throw new Error(
        'Active debt has no Credit Application ID or Debt Status for identification',
      );
    }

    // Check if sheetId exists and is not null and not a temporary ID
    const isValidSheetId =
      sheetId && sheetId !== null && !sheetId.startsWith('AD-');

    // Check if we have a temporary sheetId that needs to be replaced
    const hasTemporarySheetId = sheetId && sheetId.startsWith('AD-');

    // 1. If sheetId exists and is valid (not temporary), check if it exists in sheets before updating
    if (isValidSheetId) {
      const sheetIdExists = await this.checkSheetIdExists(sheetId);

      if (sheetIdExists) {
        try {
          this.logger.debug(
            `Updating active debt in sheet by sheetId: ${sheetId}`,
          );
          this.logger.debug(
            `Active debt data being sent to sheets:`,
            activeDebt,
          );
          await this.sheetsService.updateActiveDebt(sheetId, activeDebt);
          this.logger.debug(
            `Updated active debt in sheet: ${creditApplicationId || debtStatus} (sheetId: ${sheetId})`,
          );

          // Update the Postgres record to mark as synced
          if (activeDebt.dbId) {
            try {
              // Use the sheetId to find and update the record
              await this.activeDebtsDbService.update(sheetId, {
                synced: true, // Mark as synced
              });
              this.logger.debug(
                `Marked Postgres record ${activeDebt.dbId} as synced`,
              );
            } catch (error) {
              this.logger.warn(
                `Failed to mark Postgres record as synced: ${error}`,
              );
            }
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

    // 2. If no valid sheetId, check if a record with the same creditApplicationId and debtStatus already exists
    this.logger.debug(`No valid sheetId found, checking for existing record:`, {
      creditApplicationId: creditApplicationId,
      debtStatus: debtStatus,
      sheetId: sheetId,
      dbId: activeDebt.dbId,
    });

    // First, try to find existing record by sheetId (if we have one, even if temporary)
    let existingActiveDebt = null;
    if (sheetId) {
      existingActiveDebt = await this.findActiveDebtBySheetId(sheetId);
      if (existingActiveDebt) {
        this.logger.debug(
          `Found existing record by sheetId: ${existingActiveDebt.ID}`,
        );
      }
    }

    // If not found by sheetId, try by creditApplicationId and debtStatus
    if (!existingActiveDebt) {
      existingActiveDebt = await this.findExistingActiveDebtInSheets(
        creditApplicationId,
        debtStatus,
      );
      if (existingActiveDebt) {
        this.logger.debug(
          `Found existing record by creditApplicationId/debtStatus: ${existingActiveDebt.ID}`,
        );
      }
    }

    if (existingActiveDebt) {
      // Update existing record
      try {
        this.logger.debug(
          `Found existing active debt in sheet, updating: ${existingActiveDebt.ID}`,
        );
        await this.sheetsService.updateActiveDebt(
          existingActiveDebt.ID,
          activeDebt,
        );
        this.logger.debug(
          `Updated existing active debt in sheet: ${creditApplicationId || debtStatus} (ID: ${existingActiveDebt.ID})`,
        );

        // Update the Postgres record to mark as synced and update sheetId
        if (activeDebt.dbId) {
          try {
            // First, update the synced status using updateSyncStatus
            await this.activeDebtsDbService.updateSyncStatus(
              activeDebt.dbId,
              true,
            );
            this.logger.debug(
              `Updated Postgres record ${activeDebt.dbId} with synced: true`,
            );

            // Then, update the sheetId separately to avoid unique constraint violation
            const originalSheetId = activeDebt.sheetId || activeDebt.ID;
            await this.activeDebtsDbService.update(originalSheetId, {
              sheetId: existingActiveDebt.ID, // Update with the real sheet ID
            });
            this.logger.debug(
              `Updated Postgres record ${activeDebt.dbId} with sheetId: ${existingActiveDebt.ID}`,
            );
          } catch (error) {
            this.logger.warn(`Failed to update Postgres record: ${error}`);
          }
        }

        return; // Successfully updated, exit
      } catch (error) {
        this.logger.error(
          `Failed to update existing active debt ${existingActiveDebt.ID}: ${error}`,
        );
        throw error;
      }
    }

    // 3. If no existing record found, create new active debt
    this.logger.debug(`No existing record found, creating new active debt:`, {
      creditApplicationId: creditApplicationId,
      debtStatus: debtStatus,
      sheetId: sheetId,
    });

    const result = await this.sheetsService.addActiveDebt(activeDebt);
    this.logger.debug(
      `Added new active debt to sheet: ${creditApplicationId || debtStatus} (ID: ${result.ID})`,
    );

    // Update the Postgres record with the generated sheet ID if we have the database ID
    if (activeDebt.dbId && result.ID) {
      try {
        // First, update the synced status using updateSyncStatus
        await this.activeDebtsDbService.updateSyncStatus(activeDebt.dbId, true);
        this.logger.debug(
          `Updated Postgres record ${activeDebt.dbId} with synced: true`,
        );

        // Then, update the sheetId separately to avoid unique constraint violation
        const originalSheetId = activeDebt.sheetId || activeDebt.ID;
        await this.activeDebtsDbService.update(originalSheetId, {
          sheetId: result.ID, // Update with the real sheet ID
        });
        this.logger.debug(
          `Updated Postgres record ${activeDebt.dbId} with sheetId: ${result.ID}`,
        );
      } catch (error) {
        this.logger.warn(`Failed to update Postgres record: ${error}`);
      }
    }
  }

  /**
   * Sync a single active debt by database ID
   */
  async syncActiveDebtById(dbId: number) {
    this.logger.log(`Syncing single active debt by database ID: ${dbId}`);

    try {
      // Always fetch the latest data from the database to ensure we have the most recent file URLs
      const activeDebt = await this.activeDebtsDbService.findById(
        dbId.toString(),
      );

      if (!activeDebt) {
        return {
          success: false,
          error: `Active debt with database ID ${dbId} not found`,
        };
      }

      this.logger.debug(
        `Fetched latest active debt data from database:`,
        activeDebt,
      );

      const activeDebtInSheetFormat =
        this.activeDebtsDbService.convertDbArrayToSheet([activeDebt])[0];

      // Add the database ID to the active debt data for sync service
      (activeDebtInSheetFormat as any).dbId = activeDebt.id;

      try {
        await this.syncActiveDebtToSheet(activeDebtInSheetFormat);

        return {
          success: true,
          message: `Active debt ${activeDebt.debtStatus} synced successfully`,
          synced: 1,
          errors: 0,
          activeDebt: activeDebtInSheetFormat,
        };
      } catch (syncError) {
        const errorMessage =
          syncError instanceof Error ? syncError.message : String(syncError);
        this.logger.error(
          `Failed to sync active debt ${activeDebt.debtStatus}: ${errorMessage}`,
        );

        // Mark as unsynced if sync fails
        try {
          await this.activeDebtsDbService.updateSyncStatus(
            activeDebt.id,
            false,
          );
          this.logger.debug(
            `Marked Postgres record ${activeDebt.id} as unsynced due to sync failure`,
          );
        } catch (updateError) {
          this.logger.warn(
            `Failed to mark Postgres record as unsynced: ${updateError}`,
          );
        }

        return {
          success: false,
          error: errorMessage,
          activeDebt: activeDebtInSheetFormat,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync active debt by ID ${dbId}: ${errorMessage}`,
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
      const activeDebts = await this.sheetsService.getActiveDebts();
      const exists = activeDebts.some(
        (activeDebt) => activeDebt.ID === sheetId,
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
   * Find existing active debt in Google Sheets by sheetId
   */
  private async findActiveDebtBySheetId(sheetId: string): Promise<any> {
    try {
      const activeDebts = await this.sheetsService.getActiveDebts();
      const existingActiveDebt = activeDebts.find((activeDebt) => {
        return activeDebt.ID === sheetId;
      });

      this.logger.debug(
        `Looking for existing active debt with sheetId: ${sheetId}, found: ${existingActiveDebt ? existingActiveDebt.ID : 'none'}`,
      );
      return existingActiveDebt || null;
    } catch (error) {
      this.logger.error(
        `Error finding existing active debt by sheetId:`,
        error,
      );
      return null;
    }
  }

  /**
   * Find existing active debt in Google Sheets by creditApplicationId and debtStatus
   * For new records, we should create a new entry instead of updating existing ones
   * So we'll only look for exact matches by sheetId (for updates) or return null (for new records)
   */
  private async findExistingActiveDebtInSheets(
    creditApplicationId: string,
    debtStatus: string,
  ): Promise<any> {
    try {
      const activeDebts = await this.sheetsService.getActiveDebts();

      // Log all active debts for debugging
      this.logger.debug(
        `Searching through ${activeDebts.length} active debts in sheets`,
      );

      // For new records, we don't want to find existing records by creditApplicationId and debtStatus
      // because multiple active debts can exist for the same credit application
      // We'll only return existing records if they have a matching sheetId (for updates)
      this.logger.debug(
        `Not looking for existing active debt by creditApplicationId/debtStatus to allow multiple debts per application. Creating new record.`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error finding existing active debt:`, error);
      return null;
    }
  }

  /**
   * Sync active debts by credit application ID
   */
  async syncByCreditApplicationId(creditApplicationId: string) {
    this.logger.log(
      `Syncing active debts for credit application ID: ${creditApplicationId}`,
    );

    try {
      const activeDebts =
        await this.activeDebtsDbService.findByCreditApplicationId(
          creditApplicationId,
        );
      this.logger.log(
        `Found ${activeDebts.length} active debts for credit application ${creditApplicationId}`,
      );

      if (activeDebts.length === 0) {
        return {
          success: true,
          message: `No active debts found for credit application ${creditApplicationId}`,
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const activeDebtsInSheetFormat =
        this.activeDebtsDbService.convertDbArrayToSheet(activeDebts);

      // Add database IDs to the active debt data for sync service
      activeDebtsInSheetFormat.forEach((activeDebt, index) => {
        (activeDebt as any).dbId = activeDebts[index].id;
      });

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each active debt
      for (const activeDebt of activeDebtsInSheetFormat) {
        try {
          await this.syncActiveDebtToSheet(activeDebt);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            activeDebt:
              activeDebt['Credit Application ID'] ||
              activeDebt['Debt Status'] ||
              'Unknown',
            creditApplicationId: activeDebt['Credit Application ID'],
            debtStatus: activeDebt['Debt Status'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync active debt ${activeDebt['Credit Application ID'] || activeDebt['Debt Status']}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(
        `Sync completed for credit application ${creditApplicationId}: ${synced} synced, ${errors} errors`,
      );

      return {
        success: true,
        message: `Sync completed for credit application ${creditApplicationId}: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails,
        total: activeDebts.length,
        creditApplicationId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync active debts for credit application ${creditApplicationId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
