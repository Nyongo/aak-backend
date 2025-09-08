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
   * Filter enrollment verification data to only include fields that exist in the Google Sheets headers
   * This prevents creating new columns in the sheet
   */
  private filterEnrollmentVerificationDataForSheet(
    enrollmentVerificationData: any,
  ): any {
    // Define the expected sheet headers for enrollment verification
    const expectedSheetHeaders = [
      'ID',
      'Credit Application ID',
      'Sub County Enrollment Report',
      'Enrollment Report',
      'Number of Students This Year',
      'Number of students last year',
      'Number of students two years ago',
      'Created At',
      'Synced',
    ];

    const filteredData: any = {};

    // Only include fields that match the expected sheet headers
    expectedSheetHeaders.forEach((header) => {
      if (
        enrollmentVerificationData[header] !== undefined &&
        enrollmentVerificationData[header] !== null
      ) {
        filteredData[header] = enrollmentVerificationData[header];
      }
    });

    this.logger.debug('Filtered enrollment verification data for sheet:', {
      original: enrollmentVerificationData,
      filtered: filteredData,
    });

    return filteredData;
  }

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

    // Check if sheetId exists and is not null - all sheetIds are permanent IDs
    const isValidSheetId = sheetId && sheetId !== null;

    // 1. If sheetId exists, check if it exists in sheets before updating
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
          // Filter enrollment verification data to only include fields that exist in the sheet headers
          const filteredEnrollmentVerification =
            this.filterEnrollmentVerificationDataForSheet(
              enrollmentVerification,
            );
          await this.sheetsService.updateEnrollmentVerification(
            sheetId,
            filteredEnrollmentVerification,
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

    // 2. If no valid sheetId, this is a new record - create it
    this.logger.debug(`No valid sheetId found, creating new record:`, {
      creditApplicationId: creditApplicationId,
      sheetId: sheetId,
      dbId: enrollmentVerification.dbId,
    });

    // 3. If no existing record found, create new enrollment verification
    this.logger.debug(
      `No existing record found, creating new enrollment verification:`,
      {
        creditApplicationId: creditApplicationId,
        sheetId: sheetId,
      },
    );

    // Filter enrollment verification data to only include fields that exist in the sheet headers
    const filteredEnrollmentVerification =
      this.filterEnrollmentVerificationDataForSheet(enrollmentVerification);
    const result = await this.sheetsService.addEnrollmentVerification(
      filteredEnrollmentVerification,
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
}
