import { Injectable, Logger } from '@nestjs/common';
import { EnrollmentVerificationDbService } from './enrollment-verification-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class EnrollmentVerificationSyncService {
  private readonly logger = new Logger(EnrollmentVerificationSyncService.name);

  constructor(
    private readonly enrollmentVerificationDbService: EnrollmentVerificationDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all enrollment verifications from Postgres to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log(
      'Starting sync of all enrollment verifications from Postgres to Google Sheets',
    );

    try {
      // Get all enrollment verifications from Postgres
      const enrollmentVerifications =
        await this.enrollmentVerificationDbService.findAll();
      this.logger.log(
        `Found ${enrollmentVerifications.length} enrollment verifications in Postgres`,
      );

      if (enrollmentVerifications.length === 0) {
        return {
          success: true,
          message: 'No enrollment verifications to sync',
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const enrollmentVerificationsInSheetFormat =
        this.enrollmentVerificationDbService.convertDbArrayToSheet(
          enrollmentVerifications,
        );

      // Add database IDs to the enrollment verification data for sync service
      enrollmentVerificationsInSheetFormat.forEach(
        (enrollmentVerification, index) => {
          (enrollmentVerification as any).dbId =
            enrollmentVerifications[index].id;
        },
      );

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each enrollment verification
      for (const enrollmentVerification of enrollmentVerificationsInSheetFormat) {
        try {
          await this.syncEnrollmentVerificationToSheet(enrollmentVerification);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            enrollmentVerification:
              enrollmentVerification['Credit Application ID'] || 'Unknown',
            creditApplicationId:
              enrollmentVerification['Credit Application ID'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync enrollment verification ${enrollmentVerification['Credit Application ID']}: ${errorMessage}`,
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
        total: enrollmentVerifications.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync enrollment verifications: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single enrollment verification to Google Sheets
   */
  async syncEnrollmentVerificationToSheet(enrollmentVerification: any) {
    const creditApplicationId = enrollmentVerification['Credit Application ID'];
    const sheetId = enrollmentVerification.sheetId || enrollmentVerification.ID;

    this.logger.debug(`Syncing enrollment verification:`, {
      creditApplicationId,
      sheetId,
      isValidSheetId:
        sheetId && sheetId !== null && !sheetId.startsWith('ENR-'),
      hasTemporarySheetId: sheetId && sheetId.startsWith('ENR-'),
      dbId: enrollmentVerification.dbId,
    });

    // Log the full enrollment verification object for debugging
    this.logger.debug(
      `Full enrollment verification object:`,
      enrollmentVerification,
    );

    if (!creditApplicationId) {
      throw new Error(
        'Enrollment verification has no Credit Application ID for identification',
      );
    }

    // Check if sheetId exists and is not null and not a temporary ID
    const isValidSheetId =
      sheetId && sheetId !== null && !sheetId.startsWith('ENR-');

    // Check if we have a temporary sheetId that needs to be replaced
    const hasTemporarySheetId = sheetId && sheetId.startsWith('ENR-');

    // 1. If sheetId exists and is valid (not temporary), check if it exists in sheets before updating
    if (isValidSheetId) {
      const sheetIdExists = await this.checkSheetIdExists(sheetId);

      if (sheetIdExists) {
        try {
          this.logger.debug(
            `Updating enrollment verification in sheet by sheetId: ${sheetId}`,
          );
          this.logger.debug(
            `Enrollment verification data being sent to sheets:`,
            enrollmentVerification,
          );
          await this.sheetsService.updateEnrollmentVerification(
            sheetId,
            enrollmentVerification,
          );
          this.logger.debug(
            `Updated enrollment verification in sheet: ${creditApplicationId} (sheetId: ${sheetId})`,
          );

          // Update the Postgres record to mark as synced
          if (enrollmentVerification.dbId) {
            try {
              // Use the sheetId to find and update the record
              await this.enrollmentVerificationDbService.update(sheetId, {
                synced: true, // Mark as synced
              });
              this.logger.debug(
                `Marked Postgres record ${enrollmentVerification.dbId} as synced`,
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

    // 2. If no valid sheetId, check if a record with the same creditApplicationId already exists
    this.logger.debug(`No valid sheetId found, checking for existing record:`, {
      creditApplicationId: creditApplicationId,
      sheetId: sheetId,
      dbId: enrollmentVerification.dbId,
    });

    // First, try to find existing record by sheetId (if we have one, even if temporary)
    let existingEnrollmentVerification = null;
    if (sheetId) {
      existingEnrollmentVerification =
        await this.findEnrollmentVerificationBySheetId(sheetId);
      if (existingEnrollmentVerification) {
        this.logger.debug(
          `Found existing record by sheetId: ${existingEnrollmentVerification.ID}`,
        );
      }
    }

    // If not found by sheetId, try by creditApplicationId
    if (!existingEnrollmentVerification) {
      existingEnrollmentVerification =
        await this.findExistingEnrollmentVerificationInSheets(
          creditApplicationId,
        );
      if (existingEnrollmentVerification) {
        this.logger.debug(
          `Found existing record by creditApplicationId: ${existingEnrollmentVerification.ID}`,
        );
      }
    }

    if (existingEnrollmentVerification) {
      // Update existing record
      try {
        this.logger.debug(
          `Found existing enrollment verification in sheet, updating: ${existingEnrollmentVerification.ID}`,
        );
        await this.sheetsService.updateEnrollmentVerification(
          existingEnrollmentVerification.ID,
          enrollmentVerification,
        );
        this.logger.debug(
          `Updated existing enrollment verification in sheet: ${creditApplicationId} (ID: ${existingEnrollmentVerification.ID})`,
        );

        // Update the Postgres record to mark as synced and update sheetId
        if (enrollmentVerification.dbId) {
          try {
            // First, update the synced status using updateSyncStatus
            await this.enrollmentVerificationDbService.updateSyncStatus(
              enrollmentVerification.dbId,
              true,
            );
            this.logger.debug(
              `Updated Postgres record ${enrollmentVerification.dbId} with synced: true`,
            );

            // Then, update the sheetId separately to avoid unique constraint violation
            const originalSheetId =
              enrollmentVerification.sheetId || enrollmentVerification.ID;
            await this.enrollmentVerificationDbService.update(originalSheetId, {
              sheetId: existingEnrollmentVerification.ID, // Update with the real sheet ID
            });
            this.logger.debug(
              `Updated Postgres record ${enrollmentVerification.dbId} with sheetId: ${existingEnrollmentVerification.ID}`,
            );
          } catch (error) {
            this.logger.warn(`Failed to update Postgres record: ${error}`);
          }
        }

        return; // Successfully updated, exit
      } catch (error) {
        this.logger.error(
          `Failed to update existing enrollment verification ${existingEnrollmentVerification.ID}: ${error}`,
        );
        throw error;
      }
    }

    // 3. If no existing record found, create new enrollment verification
    this.logger.debug(
      `No existing record found, creating new enrollment verification:`,
      {
        creditApplicationId: creditApplicationId,
        sheetId: sheetId,
      },
    );

    const result = await this.sheetsService.addEnrollmentVerification(
      enrollmentVerification,
    );
    this.logger.debug(
      `Added new enrollment verification to sheet: ${creditApplicationId} (ID: ${result.ID})`,
    );

    // Update the Postgres record with the generated sheet ID if we have the database ID
    if (enrollmentVerification.dbId && result.ID) {
      try {
        // First, update the synced status using updateSyncStatus
        await this.enrollmentVerificationDbService.updateSyncStatus(
          enrollmentVerification.dbId,
          true,
        );
        this.logger.debug(
          `Updated Postgres record ${enrollmentVerification.dbId} with synced: true`,
        );

        // Then, update the sheetId separately to avoid unique constraint violation
        const originalSheetId =
          enrollmentVerification.sheetId || enrollmentVerification.ID;
        await this.enrollmentVerificationDbService.update(originalSheetId, {
          sheetId: result.ID, // Update with the real sheet ID
        });
        this.logger.debug(
          `Updated Postgres record ${enrollmentVerification.dbId} with sheetId: ${result.ID}`,
        );
      } catch (error) {
        this.logger.warn(`Failed to update Postgres record: ${error}`);
      }
    }
  }

  /**
   * Sync a single enrollment verification by database ID
   */
  async syncEnrollmentVerificationById(dbId: number) {
    this.logger.log(
      `Syncing single enrollment verification by database ID: ${dbId}`,
    );

    try {
      // Always fetch the latest data from the database to ensure we have the most recent data
      const enrollmentVerification =
        await this.enrollmentVerificationDbService.findById(dbId.toString());
      if (!enrollmentVerification) {
        throw new Error(
          `Enrollment verification with database ID ${dbId} not found`,
        );
      }

      // Convert to sheet format and add database ID
      const enrollmentVerificationInSheetFormat =
        this.enrollmentVerificationDbService.convertDbToSheet(
          enrollmentVerification,
        );
      (enrollmentVerificationInSheetFormat as any).dbId = dbId;

      // Sync to sheet
      await this.syncEnrollmentVerificationToSheet(
        enrollmentVerificationInSheetFormat,
      );

      this.logger.log(
        `Successfully synced enrollment verification ${dbId} to Google Sheets`,
      );

      return {
        success: true,
        message: `Enrollment verification ${dbId} synced successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync enrollment verification ${dbId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync enrollment verifications by credit application ID
   */
  async syncByCreditApplicationId(creditApplicationId: string) {
    this.logger.log(
      `Syncing enrollment verifications by credit application ID: ${creditApplicationId}`,
    );

    try {
      const enrollmentVerifications =
        await this.enrollmentVerificationDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (enrollmentVerifications.length === 0) {
        return {
          success: true,
          message:
            'No enrollment verifications found for this credit application',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const enrollmentVerification of enrollmentVerifications) {
        try {
          await this.syncEnrollmentVerificationById(enrollmentVerification.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync enrollment verification ${enrollmentVerification.id}: ${error}`,
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
        `Failed to sync enrollment verifications for credit application ${creditApplicationId}: ${errorMessage}`,
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
      const enrollmentVerifications =
        await this.sheetsService.getEnrollmentVerifications();
      return enrollmentVerifications.some(
        (enrollmentVerification) => enrollmentVerification.ID === sheetId,
      );
    } catch (error) {
      this.logger.error(`Error checking if sheetId exists: ${error}`);
      return false;
    }
  }

  /**
   * Find enrollment verification by sheet ID in Google Sheets
   */
  private async findEnrollmentVerificationBySheetId(
    sheetId: string,
  ): Promise<any> {
    try {
      const enrollmentVerifications =
        await this.sheetsService.getEnrollmentVerifications();
      return (
        enrollmentVerifications.find(
          (enrollmentVerification) => enrollmentVerification.ID === sheetId,
        ) || null
      );
    } catch (error) {
      this.logger.error(
        `Error finding enrollment verification by sheetId: ${error}`,
      );
      return null;
    }
  }

  /**
   * Find existing enrollment verification in Google Sheets by creditApplicationId
   * For new records, we should create a new entry instead of updating existing ones
   * So we'll only look for exact matches by sheetId (for updates) or return null (for new records)
   */
  private async findExistingEnrollmentVerificationInSheets(
    creditApplicationId: string,
  ): Promise<any> {
    try {
      const enrollmentVerifications =
        await this.sheetsService.getEnrollmentVerifications();

      // Log all enrollment verifications for debugging
      this.logger.debug(
        `Searching through ${enrollmentVerifications.length} enrollment verifications in sheets`,
      );

      // For new records, we don't want to find existing records by creditApplicationId
      // because multiple enrollment verifications can exist for the same credit application
      // We'll only return existing records if they have a matching sheetId (for updates)
      this.logger.debug(
        `Not looking for existing enrollment verification by creditApplicationId to allow multiple verifications per application. Creating new record.`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error finding existing enrollment verification:`,
        error,
      );
      return null;
    }
  }
}
