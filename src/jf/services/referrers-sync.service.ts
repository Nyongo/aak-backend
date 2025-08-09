import { Injectable, Logger } from '@nestjs/common';
import { ReferrersDbService } from './referrers-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class ReferrersSyncService {
  private readonly logger = new Logger(ReferrersSyncService.name);

  constructor(
    private readonly referrersDbService: ReferrersDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all referrers from Postgres to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log(
      'Starting sync of all referrers from Postgres to Google Sheets',
    );

    try {
      // Get all referrers from Postgres
      const referrers = await this.referrersDbService.findAll();
      this.logger.log(`Found ${referrers.length} referrers in Postgres`);

      if (referrers.length === 0) {
        return {
          success: true,
          message: 'No referrers to sync',
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const referrersInSheetFormat =
        this.referrersDbService.convertDbArrayToSheet(referrers);

      // Add database IDs to the referrer data for sync service
      referrersInSheetFormat.forEach((referrer, index) => {
        (referrer as any).dbId = referrers[index].id;
      });

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each referrer
      for (const referrer of referrersInSheetFormat) {
        try {
          await this.syncReferrerToSheet(referrer);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            referrer:
              referrer['Referrer Name'] || referrer['School ID'] || 'Unknown',
            schoolId: referrer['School ID'],
            referrerName: referrer['Referrer Name'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync referrer ${referrer['Referrer Name'] || referrer['School ID']}: ${errorMessage}`,
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
        total: referrers.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync referrers: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single referrer to Google Sheets
   */
  async syncReferrerToSheet(referrer: any) {
    const schoolId = referrer['School ID'];
    const referrerName = referrer['Referrer Name'];
    const sheetId = referrer.sheetId || referrer.ID;

    this.logger.debug(`Syncing referrer:`, {
      schoolId,
      referrerName,
      sheetId,
      isValidSheetId:
        sheetId && sheetId !== null && !sheetId.startsWith('REF-'),
      hasTemporarySheetId: sheetId && sheetId.startsWith('REF-'),
      dbId: referrer.dbId,
    });

    // Log the full referrer object for debugging
    this.logger.debug(`Full referrer object:`, referrer);

    if (!schoolId && !referrerName) {
      throw new Error(
        'Referrer has no School ID or Referrer Name for identification',
      );
    }

    // Check if sheetId exists and is not null and not a temporary ID
    const isValidSheetId =
      sheetId && sheetId !== null && !sheetId.startsWith('REF-');

    // Check if we have a temporary sheetId that needs to be replaced
    const hasTemporarySheetId = sheetId && sheetId.startsWith('REF-');

    // 1. If sheetId exists and is valid (not temporary), check if it exists in sheets before updating
    if (isValidSheetId) {
      const sheetIdExists = await this.checkSheetIdExists(sheetId);

      if (sheetIdExists) {
        try {
          this.logger.debug(
            `Updating referrer in sheet by sheetId: ${sheetId}`,
          );
          this.logger.debug(`Referrer data being sent to sheets:`, referrer);
          await this.sheetsService.updateReferrer(sheetId, referrer);
          this.logger.debug(
            `Updated referrer in sheet: ${schoolId || referrerName} (sheetId: ${sheetId})`,
          );

          // Update the Postgres record to mark as synced
          if (referrer.dbId) {
            try {
              // Use the sheetId to find and update the record
              await this.referrersDbService.update(sheetId, {
                synced: true, // Mark as synced
              });
              this.logger.debug(
                `Marked Postgres record ${referrer.dbId} as synced`,
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

    // 2. If no valid sheetId, check if a record with the same schoolId and referrerName already exists
    this.logger.debug(`No valid sheetId found, checking for existing record:`, {
      schoolId: schoolId,
      referrerName: referrerName,
      sheetId: sheetId,
      dbId: referrer.dbId,
    });

    // First, try to find existing record by sheetId (if we have one, even if temporary)
    let existingReferrer = null;
    if (sheetId) {
      existingReferrer = await this.findReferrerBySheetId(sheetId);
      if (existingReferrer) {
        this.logger.debug(
          `Found existing record by sheetId: ${existingReferrer.ID}`,
        );
      }
    }

    // If not found by sheetId, try by schoolId and referrerName
    if (!existingReferrer) {
      existingReferrer = await this.findExistingReferrerInSheets(
        schoolId,
        referrerName,
      );
      if (existingReferrer) {
        this.logger.debug(
          `Found existing record by schoolId/referrerName: ${existingReferrer.ID}`,
        );
      }
    }

    if (existingReferrer) {
      // Update existing record
      try {
        this.logger.debug(
          `Found existing referrer in sheet, updating: ${existingReferrer.ID}`,
        );
        await this.sheetsService.updateReferrer(existingReferrer.ID, referrer);
        this.logger.debug(
          `Updated existing referrer in sheet: ${schoolId || referrerName} (ID: ${existingReferrer.ID})`,
        );

        // Update the Postgres record to mark as synced and update sheetId
        if (referrer.dbId) {
          try {
            // First, update the synced status using updateSyncStatus
            await this.referrersDbService.updateSyncStatus(referrer.dbId, true);
            this.logger.debug(
              `Updated Postgres record ${referrer.dbId} with synced: true`,
            );

            // Then, update the sheetId separately to avoid unique constraint violation
            const originalSheetId = referrer.sheetId || referrer.ID;
            await this.referrersDbService.update(originalSheetId, {
              sheetId: existingReferrer.ID, // Update with the real sheet ID
            });
            this.logger.debug(
              `Updated Postgres record ${referrer.dbId} with sheetId: ${existingReferrer.ID}`,
            );
          } catch (error) {
            this.logger.warn(`Failed to update Postgres record: ${error}`);
          }
        }

        return; // Successfully updated, exit
      } catch (error) {
        this.logger.error(
          `Failed to update existing referrer ${existingReferrer.ID}: ${error}`,
        );
        throw error;
      }
    }

    // 3. If no existing record found, create new referrer
    this.logger.debug(`No existing record found, creating new referrer:`, {
      schoolId: schoolId,
      referrerName: referrerName,
      sheetId: sheetId,
    });

    const result = await this.sheetsService.addReferrer(referrer);
    this.logger.debug(
      `Added new referrer to sheet: ${schoolId || referrerName} (ID: ${result.ID})`,
    );

    // Update the Postgres record with the generated sheet ID if we have the database ID
    if (referrer.dbId && result.ID) {
      try {
        // First, update the synced status using updateSyncStatus
        await this.referrersDbService.updateSyncStatus(referrer.dbId, true);
        this.logger.debug(
          `Updated Postgres record ${referrer.dbId} with synced: true`,
        );

        // Then, update the sheetId separately to avoid unique constraint violation
        const originalSheetId = referrer.sheetId || referrer.ID;
        await this.referrersDbService.update(originalSheetId, {
          sheetId: result.ID, // Update with the real sheet ID
        });
        this.logger.debug(
          `Updated Postgres record ${referrer.dbId} with sheetId: ${result.ID}`,
        );
      } catch (error) {
        this.logger.warn(`Failed to update Postgres record: ${error}`);
      }
    }
  }

  /**
   * Sync a single referrer by database ID
   */
  async syncReferrerById(dbId: number) {
    this.logger.log(`Syncing single referrer by database ID: ${dbId}`);

    try {
      // Always fetch the latest data from the database to ensure we have the most recent file URLs
      const referrer = await this.referrersDbService.findById(dbId.toString());

      if (!referrer) {
        return {
          success: false,
          error: `Referrer with database ID ${dbId} not found`,
        };
      }

      this.logger.debug(
        `Fetched latest referrer data from database:`,
        referrer,
      );

      const referrerInSheetFormat =
        this.referrersDbService.convertDbArrayToSheet([referrer])[0];

      // Add the database ID to the referrer data for sync service
      (referrerInSheetFormat as any).dbId = referrer.id;

      try {
        await this.syncReferrerToSheet(referrerInSheetFormat);

        return {
          success: true,
          message: `Referrer ${referrer.referrerName} synced successfully`,
          synced: 1,
          errors: 0,
          referrer: referrerInSheetFormat,
        };
      } catch (syncError) {
        const errorMessage =
          syncError instanceof Error ? syncError.message : String(syncError);
        this.logger.error(
          `Failed to sync referrer ${referrer.referrerName}: ${errorMessage}`,
        );

        // Mark as unsynced if sync fails
        try {
          await this.referrersDbService.updateSyncStatus(referrer.id, false);
          this.logger.debug(
            `Marked Postgres record ${referrer.id} as unsynced due to sync failure`,
          );
        } catch (updateError) {
          this.logger.warn(
            `Failed to mark Postgres record as unsynced: ${updateError}`,
          );
        }

        return {
          success: false,
          error: errorMessage,
          referrer: referrerInSheetFormat,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync referrer by ID ${dbId}: ${errorMessage}`,
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
      const referrers = await this.sheetsService.getReferrers();
      const exists = referrers.some((referrer) => referrer.ID === sheetId);
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
   * Find existing referrer in Google Sheets by sheetId
   */
  private async findReferrerBySheetId(sheetId: string): Promise<any> {
    try {
      const referrers = await this.sheetsService.getReferrers();
      const existingReferrer = referrers.find((referrer) => {
        return referrer.ID === sheetId;
      });

      this.logger.debug(
        `Looking for existing referrer with sheetId: ${sheetId}, found: ${existingReferrer ? existingReferrer.ID : 'none'}`,
      );
      return existingReferrer || null;
    } catch (error) {
      this.logger.error(`Error finding existing referrer by sheetId:`, error);
      return null;
    }
  }

  /**
   * Find existing referrer in Google Sheets by schoolId and referrerName
   */
  private async findExistingReferrerInSheets(
    schoolId: string,
    referrerName: string,
  ): Promise<any> {
    try {
      const referrers = await this.sheetsService.getReferrers();

      // Log all referrers for debugging
      this.logger.debug(
        `Searching through ${referrers.length} referrers in sheets`,
      );

      const existingReferrer = referrers.find((referrer) => {
        const matchesSchoolId = referrer['School ID'] === schoolId;
        const matchesReferrerName = referrer['Referrer Name'] === referrerName;

        // Log each comparison for debugging
        this.logger.debug(`Comparing:`, {
          sheetSchoolId: referrer['School ID'],
          searchSchoolId: schoolId,
          sheetReferrerName: referrer['Referrer Name'],
          searchReferrerName: referrerName,
          matchesSchoolId,
          matchesReferrerName,
          fullMatch: matchesSchoolId && matchesReferrerName,
        });

        return matchesSchoolId && matchesReferrerName;
      });

      this.logger.debug(
        `Looking for existing referrer with schoolId: ${schoolId}, referrerName: ${referrerName}, found: ${existingReferrer ? existingReferrer.ID : 'none'}`,
      );
      return existingReferrer || null;
    } catch (error) {
      this.logger.error(`Error finding existing referrer:`, error);
      return null;
    }
  }

  /**
   * Sync referrers by school ID
   */
  async syncBySchoolId(schoolId: string) {
    this.logger.log(`Syncing referrers for school ID: ${schoolId}`);

    try {
      const referrers = await this.referrersDbService.findBySchoolId(schoolId);
      this.logger.log(
        `Found ${referrers.length} referrers for school ${schoolId}`,
      );

      if (referrers.length === 0) {
        return {
          success: true,
          message: `No referrers found for school ${schoolId}`,
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const referrersInSheetFormat =
        this.referrersDbService.convertDbArrayToSheet(referrers);

      // Add database IDs to the referrer data for sync service
      referrersInSheetFormat.forEach((referrer, index) => {
        (referrer as any).dbId = referrers[index].id;
      });

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each referrer
      for (const referrer of referrersInSheetFormat) {
        try {
          await this.syncReferrerToSheet(referrer);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            referrer:
              referrer['Referrer Name'] || referrer['School ID'] || 'Unknown',
            schoolId: referrer['School ID'],
            referrerName: referrer['Referrer Name'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync referrer ${referrer['Referrer Name'] || referrer['School ID']}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(
        `Sync completed for school ${schoolId}: ${synced} synced, ${errors} errors`,
      );

      return {
        success: true,
        message: `Sync completed for school ${schoolId}: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails,
        total: referrers.length,
        schoolId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync referrers for school ${schoolId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
