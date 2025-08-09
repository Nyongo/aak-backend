import { Injectable, Logger } from '@nestjs/common';
import { OtherSupportingDocsDbService } from './other-supporting-docs-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class OtherSupportingDocsSyncService {
  private readonly logger = new Logger(OtherSupportingDocsSyncService.name);

  constructor(
    private readonly otherSupportingDocsDbService: OtherSupportingDocsDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all other supporting docs to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log('Syncing all other supporting docs to Google Sheets');

    try {
      const otherSupportingDocs =
        await this.otherSupportingDocsDbService.findAll();

      if (otherSupportingDocs.length === 0) {
        return {
          success: true,
          message: 'No other supporting docs found to sync',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const otherSupportingDoc of otherSupportingDocs) {
        try {
          await this.syncOtherSupportingDocById(otherSupportingDoc.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync other supporting doc ${otherSupportingDoc.id}: ${error}`,
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
        `Failed to sync all other supporting docs: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single other supporting doc to Google Sheets
   */
  async syncOtherSupportingDocToSheet(otherSupportingDoc: any) {
    const creditApplicationId = otherSupportingDoc['Credit Application ID'];
    const sheetId = otherSupportingDoc.sheetId || otherSupportingDoc.ID;

    this.logger.debug(`Syncing other supporting doc:`, {
      creditApplicationId,
      sheetId,
      dbId: otherSupportingDoc.dbId,
      synced: otherSupportingDoc.synced,
    });

    if (!creditApplicationId) {
      throw new Error(
        'Other supporting doc has no Credit Application ID for identification',
      );
    }

    // Determine if sheetId is valid (not temporary)
    const isValidSheetId = sheetId && !sheetId.startsWith('DOC-');
    const hasTemporarySheetId = sheetId && sheetId.startsWith('DOC-');

    this.logger.debug(`SheetId analysis:`, {
      sheetId,
      isValidSheetId,
      hasTemporarySheetId,
      creditApplicationId,
      dbId: otherSupportingDoc.dbId,
      synced: otherSupportingDoc.synced,
    });

    // 1. If sheetId exists and is valid (not temporary), try to update existing record
    if (isValidSheetId) {
      const existingRecord =
        await this.findOtherSupportingDocBySheetId(sheetId);
      if (existingRecord) {
        try {
          this.logger.debug(
            `Updating existing other supporting doc in sheet by sheetId: ${sheetId}`,
          );
          await this.sheetsService.updateOtherSupportingDoc(
            sheetId,
            otherSupportingDoc,
          );
          this.logger.debug(
            `Updated existing other supporting doc in sheet: ${creditApplicationId} (sheetId: ${sheetId})`,
          );

          // Update the Postgres record to mark as synced
          if (otherSupportingDoc.dbId) {
            await this.otherSupportingDocsDbService.updateSyncStatus(
              otherSupportingDoc.dbId,
              true,
            );
            this.logger.debug(
              `Marked Postgres record ${otherSupportingDoc.dbId} as synced`,
            );
          }

          return; // Successfully updated, exit
        } catch (error) {
          this.logger.error(`Failed to update by sheetId ${sheetId}: ${error}`);
          throw error;
        }
      } else {
        this.logger.warn(
          `SheetId ${sheetId} exists in Postgres but not found in Google Sheets. This indicates data inconsistency.`,
        );
      }
    }

    // 2. For records with temporary sheetId, use the operation parameter to determine action
    if (hasTemporarySheetId) {
      const operation = (otherSupportingDoc as any).operation;

      if (operation === 'update') {
        // This is an update operation - try to find existing record by creditApplicationId
        this.logger.debug(
          `Record has temporary sheetId and operation is 'update'. Looking for existing record by creditApplicationId.`,
        );

        const existingRecord =
          await this.findExistingOtherSupportingDocInSheets(
            otherSupportingDoc.sheetId || otherSupportingDoc.ID,
          );
        if (existingRecord) {
          this.logger.debug(
            `Found existing record in Google Sheets: ${existingRecord.ID}. Updating it.`,
          );

          try {
            await this.sheetsService.updateOtherSupportingDoc(
              existingRecord.ID,
              otherSupportingDoc,
            );
            this.logger.debug(
              `Updated existing other supporting doc in sheet: ${creditApplicationId} (ID: ${existingRecord.ID})`,
            );

            // Update the Postgres record with the real sheetId and mark as synced
            if (otherSupportingDoc.dbId) {
              try {
                // First, update the synced status
                await this.otherSupportingDocsDbService.updateSyncStatus(
                  otherSupportingDoc.dbId,
                  true,
                );
                this.logger.debug(
                  `Marked Postgres record ${otherSupportingDoc.dbId} as synced`,
                );

                // Then, update the sheetId to the real one from Google Sheets
                const originalSheetId =
                  otherSupportingDoc.sheetId || otherSupportingDoc.ID;
                await this.otherSupportingDocsDbService.update(
                  originalSheetId,
                  {
                    sheetId: existingRecord.ID, // Update with the real sheet ID
                  },
                );
                this.logger.debug(
                  `Updated Postgres record ${otherSupportingDoc.dbId} with sheetId: ${existingRecord.ID}`,
                );
              } catch (error) {
                this.logger.warn(`Failed to update Postgres record: ${error}`);
              }
            }

            return; // Successfully updated, exit
          } catch (error) {
            this.logger.error(
              `Failed to update existing other supporting doc ${existingRecord.ID}: ${error}`,
            );
            throw error;
          }
        } else {
          this.logger.warn(
            `No existing record found for creditApplicationId ${creditApplicationId}. This might be a new record or data inconsistency.`,
          );
        }
      } else {
        // This is a create operation - don't look for existing records
        this.logger.debug(
          `Record has temporary sheetId and operation is 'create' or undefined. Will create new entry.`,
        );
      }
    }

    // 3. Create new other supporting doc
    // Create new record if this is unsynced (new record)
    if (!otherSupportingDoc.synced) {
      this.logger.debug(`Creating new other supporting doc:`, {
        creditApplicationId: creditApplicationId,
        sheetId: sheetId,
        synced: otherSupportingDoc.synced,
        hasTemporarySheetId: hasTemporarySheetId,
      });

      const result =
        await this.sheetsService.addOtherSupportingDoc(otherSupportingDoc);
      this.logger.debug(
        `Added new other supporting doc to sheet: ${creditApplicationId} (ID: ${result.ID})`,
      );

      // Update the Postgres record with the generated sheet ID if we have the database ID
      if (otherSupportingDoc.dbId && result.ID) {
        try {
          // First, update the synced status using updateSyncStatus
          await this.otherSupportingDocsDbService.updateSyncStatus(
            otherSupportingDoc.dbId,
            true,
          );
          this.logger.debug(
            `Updated Postgres record ${otherSupportingDoc.dbId} with synced: true`,
          );

          // Then, update the sheetId separately to avoid unique constraint violation
          const originalSheetId =
            otherSupportingDoc.sheetId || otherSupportingDoc.ID;

          // Check if the new sheetId already exists in the database
          const existingRecordWithNewSheetId =
            await this.otherSupportingDocsDbService.findBySheetId(result.ID);
          if (
            existingRecordWithNewSheetId &&
            existingRecordWithNewSheetId.id !== otherSupportingDoc.dbId
          ) {
            this.logger.warn(
              `SheetId ${result.ID} already exists in database for record ${existingRecordWithNewSheetId.id}. Skipping sheetId update to avoid unique constraint violation.`,
            );
          } else {
            await this.otherSupportingDocsDbService.update(originalSheetId, {
              sheetId: result.ID, // Update with the real sheet ID
            });
            this.logger.debug(
              `Updated Postgres record ${otherSupportingDoc.dbId} with sheetId: ${result.ID}`,
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to update Postgres record: ${error}`);
        }
      }
    }
  }

  /**
   * Sync a single other supporting doc by database ID
   */
  async syncOtherSupportingDocById(
    dbId: number,
    operation?: 'create' | 'update',
  ) {
    this.logger.log(
      `Syncing single other supporting doc by database ID: ${dbId} (operation: ${operation || 'unknown'})`,
    );

    try {
      // Always fetch the latest data from the database to ensure we have the most recent data
      const otherSupportingDoc =
        await this.otherSupportingDocsDbService.findById(dbId.toString());
      if (!otherSupportingDoc) {
        throw new Error(
          `Other supporting doc with database ID ${dbId} not found`,
        );
      }

      // Convert to sheet format and add database ID
      const otherSupportingDocInSheetFormat =
        this.otherSupportingDocsDbService.convertDbToSheet(otherSupportingDoc);
      (otherSupportingDocInSheetFormat as any).dbId = dbId;
      (otherSupportingDocInSheetFormat as any).operation = operation;

      // Sync to sheet
      await this.syncOtherSupportingDocToSheet(otherSupportingDocInSheetFormat);

      this.logger.log(
        `Successfully synced other supporting doc ${dbId} to Google Sheets`,
      );

      return {
        success: true,
        message: `Other supporting doc ${dbId} synced successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync other supporting doc ${dbId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync other supporting docs by credit application ID
   */
  async syncByCreditApplicationId(creditApplicationId: string) {
    this.logger.log(
      `Syncing other supporting docs by credit application ID: ${creditApplicationId}`,
    );

    try {
      const otherSupportingDocs =
        await this.otherSupportingDocsDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (otherSupportingDocs.length === 0) {
        return {
          success: true,
          message: 'No other supporting docs found for this credit application',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const otherSupportingDoc of otherSupportingDocs) {
        try {
          await this.syncOtherSupportingDocById(otherSupportingDoc.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync other supporting doc ${otherSupportingDoc.id}: ${error}`,
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
        `Failed to sync other supporting docs for credit application ${creditApplicationId}: ${errorMessage}`,
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
      const otherSupportingDocs =
        await this.sheetsService.getOtherSupportingDocs();
      const exists = otherSupportingDocs.some(
        (otherSupportingDoc) => otherSupportingDoc.ID === sheetId,
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
   * Find other supporting doc by sheet ID in Google Sheets
   */
  private async findOtherSupportingDocBySheetId(sheetId: string): Promise<any> {
    try {
      const otherSupportingDocs =
        await this.sheetsService.getOtherSupportingDocs();
      return (
        otherSupportingDocs.find(
          (otherSupportingDoc) => otherSupportingDoc.ID === sheetId,
        ) || null
      );
    } catch (error) {
      this.logger.error(
        `Error finding other supporting doc by sheetId: ${error}`,
      );
      return null;
    }
  }

  /**
   * Find existing other supporting doc in Google Sheets by ID (sheetId)
   * This method is used when we have a synced record with a temporary sheetId
   * and need to find the real Google Sheets record to update it
   */
  private async findExistingOtherSupportingDocInSheets(
    sheetId: string,
  ): Promise<any> {
    try {
      const otherSupportingDocs =
        await this.sheetsService.getOtherSupportingDocs();

      // Log all other supporting docs for debugging
      this.logger.debug(
        `Searching through ${otherSupportingDocs.length} other supporting docs in sheets for sheetId: ${sheetId}`,
      );

      // Log all records to see what we're working with
      otherSupportingDocs.forEach((record, index) => {
        this.logger.debug(
          `Record ${index}: ID=${record.ID}, Credit Application ID=${record['Credit Application ID']}, Document Type=${record['Document Type']}`,
        );
      });

      // Find the exact record by ID (sheetId)
      const existingRecord = otherSupportingDocs.find(
        (otherSupportingDoc) => otherSupportingDoc.ID === sheetId,
      );

      if (existingRecord) {
        this.logger.debug(
          `Found existing other supporting doc in sheets with ID: ${sheetId}`,
        );
        return existingRecord;
      }

      this.logger.debug(
        `No existing other supporting doc found in sheets for sheetId: ${sheetId}`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error finding existing other supporting doc:`, error);
      return null;
    }
  }
}
