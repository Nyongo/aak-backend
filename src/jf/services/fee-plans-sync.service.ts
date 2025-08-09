import { Injectable, Logger } from '@nestjs/common';
import { FeePlansDbService } from './fee-plans-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class FeePlansSyncService {
  private readonly logger = new Logger(FeePlansSyncService.name);

  constructor(
    private readonly feePlansDbService: FeePlansDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all fee plans from Postgres to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log(
      'Starting sync of all fee plans from Postgres to Google Sheets',
    );

    try {
      // Get all fee plans from Postgres
      const feePlans = await this.feePlansDbService.findAll();
      this.logger.log(`Found ${feePlans.length} fee plans in Postgres`);

      if (feePlans.length === 0) {
        return {
          success: true,
          message: 'No fee plans to sync',
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const feePlansInSheetFormat =
        this.feePlansDbService.convertDbArrayToSheet(feePlans);

      // Add database IDs to the fee plan data for sync service
      feePlansInSheetFormat.forEach((feePlan, index) => {
        (feePlan as any).dbId = feePlans[index].id;
      });

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each fee plan
      for (const feePlan of feePlansInSheetFormat) {
        try {
          await this.syncFeePlanToSheet(feePlan);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            feePlan:
              feePlan['Credit Application ID'] ||
              feePlan['School Year'] ||
              'Unknown',
            creditApplicationId: feePlan['Credit Application ID'],
            schoolYear: feePlan['School Year'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync fee plan ${feePlan['Credit Application ID'] || feePlan['School Year']}: ${errorMessage}`,
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
        total: feePlans.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync fee plans: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single fee plan to Google Sheets
   */
  async syncFeePlanToSheet(feePlan: any) {
    const creditApplicationId = feePlan['Credit Application ID'];
    const schoolYear = feePlan['School Year'];
    const sheetId = feePlan.sheetId || feePlan.ID;

    this.logger.debug(`Syncing fee plan:`, {
      creditApplicationId,
      schoolYear,
      sheetId,
      isValidSheetId: sheetId && sheetId !== null && !sheetId.startsWith('FP-'),
      hasTemporarySheetId: sheetId && sheetId.startsWith('FP-'),
      dbId: feePlan.dbId,
    });

    // Log the full fee plan object for debugging
    this.logger.debug(`Full fee plan object:`, feePlan);

    if (!creditApplicationId && !schoolYear) {
      throw new Error(
        'Fee plan has no Credit Application ID or School Year for identification',
      );
    }

    // Check if sheetId exists and is not null and not a temporary ID
    const isValidSheetId =
      sheetId && sheetId !== null && !sheetId.startsWith('FP-');

    // Check if we have a temporary sheetId that needs to be replaced
    const hasTemporarySheetId = sheetId && sheetId.startsWith('FP-');

    // 1. If sheetId exists and is valid (not temporary), check if it exists in sheets before updating
    if (isValidSheetId) {
      const sheetIdExists = await this.checkSheetIdExists(sheetId);

      if (sheetIdExists) {
        try {
          this.logger.debug(
            `Updating fee plan in sheet by sheetId: ${sheetId}`,
          );
          this.logger.debug(`Fee plan data being sent to sheets:`, feePlan);
          await this.sheetsService.updateFeePlan(sheetId, feePlan);
          this.logger.debug(
            `Updated fee plan in sheet: ${creditApplicationId || schoolYear} (sheetId: ${sheetId})`,
          );

          // Update the Postgres record to mark as synced
          if (feePlan.dbId) {
            try {
              // Use the sheetId to find and update the record
              await this.feePlansDbService.update(sheetId, {
                synced: true, // Mark as synced
              });
              this.logger.debug(
                `Marked Postgres record ${feePlan.dbId} as synced`,
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

    // 2. If no valid sheetId, check if a record with the same creditApplicationId and schoolYear already exists
    this.logger.debug(`No valid sheetId found, checking for existing record:`, {
      creditApplicationId: creditApplicationId,
      schoolYear: schoolYear,
      sheetId: sheetId,
      dbId: feePlan.dbId,
    });

    // First, try to find existing record by sheetId (if we have one, even if temporary)
    let existingFeePlan = null;
    if (sheetId) {
      existingFeePlan = await this.findFeePlanBySheetId(sheetId);
      if (existingFeePlan) {
        this.logger.debug(
          `Found existing record by sheetId: ${existingFeePlan.ID}`,
        );
      }
    }

    // If not found by sheetId, try by creditApplicationId and schoolYear
    if (!existingFeePlan) {
      existingFeePlan = await this.findExistingFeePlanInSheets(
        creditApplicationId,
        schoolYear,
      );
      if (existingFeePlan) {
        this.logger.debug(
          `Found existing record by creditApplicationId/schoolYear: ${existingFeePlan.ID}`,
        );
      }
    }

    if (existingFeePlan) {
      // Update existing record
      try {
        this.logger.debug(
          `Found existing fee plan in sheet, updating: ${existingFeePlan.ID}`,
        );
        await this.sheetsService.updateFeePlan(existingFeePlan.ID, feePlan);
        this.logger.debug(
          `Updated existing fee plan in sheet: ${creditApplicationId || schoolYear} (ID: ${existingFeePlan.ID})`,
        );

        // Update the Postgres record to mark as synced and update sheetId
        if (feePlan.dbId) {
          try {
            // First, update the synced status using updateSyncStatus
            await this.feePlansDbService.updateSyncStatus(feePlan.dbId, true);
            this.logger.debug(
              `Updated Postgres record ${feePlan.dbId} with synced: true`,
            );

            // Then, update the sheetId separately to avoid unique constraint violation
            const originalSheetId = feePlan.sheetId || feePlan.ID;
            await this.feePlansDbService.update(originalSheetId, {
              sheetId: existingFeePlan.ID, // Update with the real sheet ID
            });
            this.logger.debug(
              `Updated Postgres record ${feePlan.dbId} with sheetId: ${existingFeePlan.ID}`,
            );
          } catch (error) {
            this.logger.warn(`Failed to update Postgres record: ${error}`);
          }
        }

        return; // Successfully updated, exit
      } catch (error) {
        this.logger.error(
          `Failed to update existing fee plan ${existingFeePlan.ID}: ${error}`,
        );
        throw error;
      }
    }

    // 3. If no existing record found, create new fee plan
    this.logger.debug(`No existing record found, creating new fee plan:`, {
      creditApplicationId: creditApplicationId,
      schoolYear: schoolYear,
      sheetId: sheetId,
    });

    const result = await this.sheetsService.addFeePlan(feePlan);
    this.logger.debug(
      `Added new fee plan to sheet: ${creditApplicationId || schoolYear} (ID: ${result.ID})`,
    );

    // Update the Postgres record with the generated sheet ID if we have the database ID
    if (feePlan.dbId && result.ID) {
      try {
        // First, update the synced status using updateSyncStatus
        await this.feePlansDbService.updateSyncStatus(feePlan.dbId, true);
        this.logger.debug(
          `Updated Postgres record ${feePlan.dbId} with synced: true`,
        );

        // Then, update the sheetId separately to avoid unique constraint violation
        const originalSheetId = feePlan.sheetId || feePlan.ID;
        await this.feePlansDbService.update(originalSheetId, {
          sheetId: result.ID, // Update with the real sheet ID
        });
        this.logger.debug(
          `Updated Postgres record ${feePlan.dbId} with sheetId: ${result.ID}`,
        );
      } catch (error) {
        this.logger.warn(`Failed to update Postgres record: ${error}`);
      }
    }
  }

  /**
   * Sync a single fee plan by database ID
   */
  async syncFeePlanById(dbId: number) {
    this.logger.log(`Syncing single fee plan by database ID: ${dbId}`);

    try {
      // Always fetch the latest data from the database to ensure we have the most recent file URLs
      const feePlan = await this.feePlansDbService.findById(dbId.toString());
      if (!feePlan) {
        throw new Error(`Fee plan with database ID ${dbId} not found`);
      }

      // Convert to sheet format and add database ID
      const feePlanInSheetFormat =
        this.feePlansDbService.convertDbToSheet(feePlan);
      (feePlanInSheetFormat as any).dbId = dbId;

      // Sync to sheet
      await this.syncFeePlanToSheet(feePlanInSheetFormat);

      this.logger.log(`Successfully synced fee plan ${dbId} to Google Sheets`);

      return {
        success: true,
        message: `Fee plan ${dbId} synced successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync fee plan ${dbId}: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync fee plans by credit application ID
   */
  async syncByCreditApplicationId(creditApplicationId: string) {
    this.logger.log(
      `Syncing fee plans by credit application ID: ${creditApplicationId}`,
    );

    try {
      const feePlans =
        await this.feePlansDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (feePlans.length === 0) {
        return {
          success: true,
          message: 'No fee plans found for this credit application',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const feePlan of feePlans) {
        try {
          await this.syncFeePlanById(feePlan.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(`Failed to sync fee plan ${feePlan.id}: ${error}`);
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
        `Failed to sync fee plans for credit application ${creditApplicationId}: ${errorMessage}`,
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
      const feePlans = await this.sheetsService.getFeePlans();
      return feePlans.some((feePlan) => feePlan.ID === sheetId);
    } catch (error) {
      this.logger.error(`Error checking if sheetId exists: ${error}`);
      return false;
    }
  }

  /**
   * Find fee plan by sheet ID in Google Sheets
   */
  private async findFeePlanBySheetId(sheetId: string): Promise<any> {
    try {
      const feePlans = await this.sheetsService.getFeePlans();
      return feePlans.find((feePlan) => feePlan.ID === sheetId) || null;
    } catch (error) {
      this.logger.error(`Error finding fee plan by sheetId: ${error}`);
      return null;
    }
  }

  /**
   * Find existing fee plan in Google Sheets by creditApplicationId and schoolYear
   * For new records, we should create a new entry instead of updating existing ones
   * So we'll only look for exact matches by sheetId (for updates) or return null (for new records)
   */
  private async findExistingFeePlanInSheets(
    creditApplicationId: string,
    schoolYear: string,
  ): Promise<any> {
    try {
      const feePlans = await this.sheetsService.getFeePlans();

      // Log all fee plans for debugging
      this.logger.debug(
        `Searching through ${feePlans.length} fee plans in sheets`,
      );

      // For new records, we don't want to find existing records by creditApplicationId and schoolYear
      // because multiple fee plans can exist for the same credit application
      // We'll only return existing records if they have a matching sheetId (for updates)
      this.logger.debug(
        `Not looking for existing fee plan by creditApplicationId/schoolYear to allow multiple plans per application. Creating new record.`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error finding existing fee plan:`, error);
      return null;
    }
  }
}
