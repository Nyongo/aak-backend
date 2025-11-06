import { Injectable, Logger } from '@nestjs/common';
import { CreditApplicationsDbService } from './credit-applications-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class CreditApplicationsSyncService {
  private readonly logger = new Logger(CreditApplicationsSyncService.name);

  constructor(
    private readonly creditApplicationsDbService: CreditApplicationsDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all credit applications from Postgres to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log(
      'Starting sync of all credit applications from Postgres to Google Sheets',
    );

    try {
      // Get all credit applications from Postgres
      const creditApplications =
        await this.creditApplicationsDbService.findAll();
      this.logger.log(
        `Found ${creditApplications.length} credit applications in Postgres`,
      );

      if (creditApplications.length === 0) {
        return {
          success: true,
          message: 'No credit applications to sync',
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const creditApplicationsInSheetFormat =
        this.creditApplicationsDbService.convertDbArrayToSheet(
          creditApplications,
        );

      // Add database IDs to the credit application data for sync service
      creditApplicationsInSheetFormat.forEach((creditApplication, index) => {
        (creditApplication as any).dbId = creditApplications[index].id;
      });

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each credit application
      for (const creditApplication of creditApplicationsInSheetFormat) {
        try {
          await this.syncCreditApplicationToSheet(creditApplication);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            creditApplication:
              creditApplication['Borrower ID'] ||
              creditApplication['Credit Type'] ||
              'Unknown',
            borrowerId: creditApplication['Borrower ID'],
            creditType: creditApplication['Credit Type'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync credit application ${creditApplication['Borrower ID'] || creditApplication['Credit Type']}: ${errorMessage}`,
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
        total: creditApplications.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync credit applications: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single credit application to Google Sheets
   */
  async syncCreditApplicationToSheet(creditApplication: any) {
    const borrowerId = creditApplication['Borrower ID'];
    const creditType = creditApplication['Credit Type'];
    const sheetId = creditApplication.sheetId || creditApplication.ID;

    this.logger.debug(`Syncing credit application:`, {
      borrowerId,
      creditType,
      sheetId,
      isValidSheetId: sheetId && sheetId !== null && !sheetId.startsWith('CA-'),
      hasTemporarySheetId: sheetId && sheetId.startsWith('CA-'),
      dbId: creditApplication.dbId,
    });

    // Log the full credit application object for debugging
    this.logger.debug(`Full credit application object:`, creditApplication);

    if (!borrowerId && !creditType) {
      throw new Error(
        'Credit application has no Borrower ID or Credit Type for identification',
      );
    }

    // Check if sheetId exists and is not null
    const isValidSheetId = sheetId && sheetId !== null;

    // 1. If sheetId exists and is valid, check if it exists in sheets before updating
    if (isValidSheetId) {
      const sheetIdExists = await this.checkSheetIdExists(sheetId);

      if (sheetIdExists) {
        try {
          this.logger.debug(
            `Updating credit application in sheet by sheetId: ${sheetId}`,
          );
          this.logger.debug(
            `Credit application data being sent to sheets:`,
            creditApplication,
          );
          await this.sheetsService.updateCreditApplication(
            sheetId,
            creditApplication,
          );
          this.logger.debug(
            `Updated credit application in sheet: ${borrowerId || creditType} (sheetId: ${sheetId})`,
          );

          // Update the Postgres record to mark as synced
          if (creditApplication.dbId) {
            try {
              // Use the sheetId to find and update the record
              await this.creditApplicationsDbService.update(sheetId, {
                synced: true, // Mark as synced
              });
              this.logger.debug(
                `Marked Postgres record ${creditApplication.dbId} as synced`,
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

    // 2. If we have a sheetId, always create a new record with that ID
    // This allows multiple credit applications for the same borrower
    if (sheetId) {
      this.logger.debug(
        `Creating new credit application with sheetId as permanent ID:`,
        {
          borrowerId: borrowerId,
          creditType: creditType,
          sheetId: sheetId,
        },
      );

      let result;
      // Use our sheetId as the permanent ID in the sheet
      this.logger.debug(
        `Creating new credit application with sheetId as permanent ID: ${sheetId}`,
      );
      result = await this.sheetsService.addCreditApplicationWithId(
        creditApplication,
        sheetId,
      );

      this.logger.debug(
        `Added new credit application to sheet: ${borrowerId || creditType} (ID: ${result.ID})`,
      );

      // Update the Postgres record with the final sheet ID if we have the database ID
      if (creditApplication.dbId && result.ID) {
        try {
          // If we used a sheetId, it should now be the permanent ID
          if (result.ID !== sheetId) {
            await this.creditApplicationsDbService.update(
              creditApplication.dbId,
              {
                sheetId: result.ID,
              },
            );
            this.logger.debug(
              `Updated sheetId in database from ${sheetId} to ${result.ID}`,
            );
          }

          // Mark as synced
          await this.creditApplicationsDbService.updateSyncStatus(
            creditApplication.dbId,
            true,
          );
          this.logger.debug(
            `Marked Postgres record ${creditApplication.dbId} as synced`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to update sheetId or mark Postgres record as synced: ${error}`,
          );
        }
      }
      return; // Successfully created, exit
    }

    // 3. If no sheetId provided, check for existing records by borrowerId and creditType
    this.logger.debug(`No sheetId provided, checking for existing record:`, {
      borrowerId: borrowerId,
      creditType: creditType,
      dbId: creditApplication.dbId,
    });

    // Try to find existing record by borrowerId and creditType
    const existingCreditApplication =
      await this.findExistingCreditApplicationInSheets(borrowerId, creditType);

    if (existingCreditApplication) {
      // Update existing record
      try {
        this.logger.debug(
          `Found existing credit application in sheet, updating: ${existingCreditApplication.ID}`,
        );
        await this.sheetsService.updateCreditApplication(
          existingCreditApplication.ID,
          creditApplication,
        );
        this.logger.debug(
          `Updated existing credit application in sheet: ${borrowerId || creditType} (ID: ${existingCreditApplication.ID})`,
        );

        // Update the Postgres record to mark as synced and update sheetId
        if (creditApplication.dbId) {
          try {
            // First, update the synced status using updateSyncStatus
            await this.creditApplicationsDbService.updateSyncStatus(
              creditApplication.dbId,
              true,
            );
            this.logger.debug(
              `Updated Postgres record ${creditApplication.dbId} with synced: true`,
            );

            // Then, update the sheetId separately to avoid unique constraint violation
            await this.creditApplicationsDbService.update(
              creditApplication.dbId,
              {
                sheetId: existingCreditApplication.ID, // Update with the real sheet ID
              },
            );
            this.logger.debug(
              `Updated Postgres record ${creditApplication.dbId} with sheetId: ${existingCreditApplication.ID}`,
            );
          } catch (error) {
            this.logger.warn(`Failed to update Postgres record: ${error}`);
          }
        }

        return; // Successfully updated, exit
      } catch (error) {
        this.logger.error(
          `Failed to update existing credit application ${existingCreditApplication.ID}: ${error}`,
        );
        throw error;
      }
    }

    // 4. If no existing record found, create new credit application
    this.logger.debug(
      `No existing record found, creating new credit application:`,
      {
        borrowerId: borrowerId,
        creditType: creditType,
      },
    );

    const result =
      await this.sheetsService.addCreditApplication(creditApplication);
    this.logger.debug(
      `Added new credit application to sheet: ${borrowerId || creditType} (ID: ${result.ID})`,
    );

    // Update the Postgres record with the generated sheet ID if we have the database ID
    if (creditApplication.dbId && result.ID) {
      try {
        // First, update the synced status using updateSyncStatus
        await this.creditApplicationsDbService.updateSyncStatus(
          creditApplication.dbId,
          true,
        );
        this.logger.debug(
          `Updated Postgres record ${creditApplication.dbId} with synced: true`,
        );

        // Then, update the sheetId separately to avoid unique constraint violation
        await this.creditApplicationsDbService.update(creditApplication.dbId, {
          sheetId: result.ID, // Update with the real sheet ID
        });
        this.logger.debug(
          `Updated Postgres record ${creditApplication.dbId} with sheetId: ${result.ID}`,
        );
      } catch (error) {
        this.logger.warn(`Failed to update Postgres record: ${error}`);
      }
    }
  }

  /**
   * Sync a single credit application by database ID
   */
  async syncCreditApplicationById(dbId: number, sheetId?: string) {
    this.logger.log(
      `Syncing single credit application by database ID: ${dbId}${sheetId ? ` with sheetId: ${sheetId}` : ''}`,
    );

    try {
      // Always fetch the latest data from the database to ensure we have the most recent file URLs
      const creditApplication = await this.creditApplicationsDbService.findById(
        dbId.toString(),
      );

      if (!creditApplication) {
        return {
          success: false,
          error: `Credit application with database ID ${dbId} not found`,
        };
      }

      this.logger.debug(
        `Fetched latest credit application data from database:`,
        creditApplication,
      );

      const creditApplicationInSheetFormat =
        this.creditApplicationsDbService.convertDbArrayToSheet([
          creditApplication,
        ])[0];

      // Add the database ID to the credit application data for sync service
      (creditApplicationInSheetFormat as any).dbId = creditApplication.id;

      // Log the converted sheet format to verify "Photo of Check" is included
      this.logger.debug(
        `Credit application in sheet format - Photo of Check: ${creditApplicationInSheetFormat['Photo of Check']}`,
      );
      this.logger.debug(
        `Full credit application in sheet format:`,
        creditApplicationInSheetFormat,
      );

      // If a sheetId is provided, use it as the permanent ID
      if (sheetId) {
        creditApplicationInSheetFormat.sheetId = sheetId;
        creditApplicationInSheetFormat.ID = sheetId;
      }

      try {
        await this.syncCreditApplicationToSheet(creditApplicationInSheetFormat);

        return {
          success: true,
          message: `Credit application ${creditApplication.creditType} synced successfully`,
          synced: 1,
          errors: 0,
          creditApplication: creditApplicationInSheetFormat,
        };
      } catch (syncError) {
        const errorMessage =
          syncError instanceof Error ? syncError.message : String(syncError);
        this.logger.error(
          `Failed to sync credit application ${creditApplication.creditType}: ${errorMessage}`,
        );

        // Mark as unsynced if sync fails
        try {
          await this.creditApplicationsDbService.updateSyncStatus(
            creditApplication.id,
            false,
          );
          this.logger.debug(
            `Marked Postgres record ${creditApplication.id} as unsynced due to sync failure`,
          );
        } catch (updateError) {
          this.logger.warn(
            `Failed to mark Postgres record as unsynced: ${updateError}`,
          );
        }

        return {
          success: false,
          error: errorMessage,
          creditApplication: creditApplicationInSheetFormat,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync credit application by ID ${dbId}: ${errorMessage}`,
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
      const creditApplications =
        await this.sheetsService.getCreditApplications();
      const exists = creditApplications.some(
        (creditApplication) => creditApplication.ID === sheetId,
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
   * Find existing credit application in Google Sheets by sheetId
   */
  private async findCreditApplicationBySheetId(sheetId: string): Promise<any> {
    try {
      const creditApplications =
        await this.sheetsService.getCreditApplications();
      const existingCreditApplication = creditApplications.find(
        (creditApplication) => {
          return creditApplication.ID === sheetId;
        },
      );

      this.logger.debug(
        `Looking for existing credit application with sheetId: ${sheetId}, found: ${existingCreditApplication ? existingCreditApplication.ID : 'none'}`,
      );
      return existingCreditApplication || null;
    } catch (error) {
      this.logger.error(
        `Error finding existing credit application by sheetId:`,
        error,
      );
      return null;
    }
  }

  /**
   * Find existing credit application in Google Sheets by borrowerId and creditType
   */
  private async findExistingCreditApplicationInSheets(
    borrowerId: string,
    creditType: string,
  ): Promise<any> {
    try {
      const creditApplications =
        await this.sheetsService.getCreditApplications();

      // Log all credit applications for debugging
      this.logger.debug(
        `Searching through ${creditApplications.length} credit applications in sheets`,
      );

      const existingCreditApplication = creditApplications.find(
        (creditApplication) => {
          const matchesBorrowerId =
            creditApplication['Borrower ID'] === borrowerId;
          const matchesCreditType =
            creditApplication['Credit Type'] === creditType;

          // Log each comparison for debugging
          this.logger.debug(`Comparing:`, {
            sheetBorrowerId: creditApplication['Borrower ID'],
            searchBorrowerId: borrowerId,
            sheetCreditType: creditApplication['Credit Type'],
            searchCreditType: creditType,
            matchesBorrowerId,
            matchesCreditType,
            fullMatch: matchesBorrowerId && matchesCreditType,
          });

          return matchesBorrowerId && matchesCreditType;
        },
      );

      this.logger.debug(
        `Looking for existing credit application with borrowerId: ${borrowerId}, creditType: ${creditType}, found: ${existingCreditApplication ? existingCreditApplication.ID : 'none'}`,
      );
      return existingCreditApplication || null;
    } catch (error) {
      this.logger.error(`Error finding existing credit application:`, error);
      return null;
    }
  }

  /**
   * Sync credit applications by borrower ID
   */
  async syncByBorrowerId(borrowerId: string) {
    this.logger.log(
      `Syncing credit applications for borrower ID: ${borrowerId}`,
    );

    try {
      const creditApplications =
        await this.creditApplicationsDbService.findByBorrowerId(borrowerId);
      this.logger.log(
        `Found ${creditApplications.length} credit applications for borrower ${borrowerId}`,
      );

      if (creditApplications.length === 0) {
        return {
          success: true,
          message: `No credit applications found for borrower ${borrowerId}`,
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const creditApplicationsInSheetFormat =
        this.creditApplicationsDbService.convertDbArrayToSheet(
          creditApplications,
        );

      // Add database IDs to the credit application data for sync service
      creditApplicationsInSheetFormat.forEach((creditApplication, index) => {
        (creditApplication as any).dbId = creditApplications[index].id;
      });

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each credit application
      for (const creditApplication of creditApplicationsInSheetFormat) {
        try {
          await this.syncCreditApplicationToSheet(creditApplication);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            creditApplication:
              creditApplication['Borrower ID'] ||
              creditApplication['Credit Type'] ||
              'Unknown',
            borrowerId: creditApplication['Borrower ID'],
            creditType: creditApplication['Credit Type'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync credit application ${creditApplication['Borrower ID'] || creditApplication['Credit Type']}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(
        `Sync completed for borrower ${borrowerId}: ${synced} synced, ${errors} errors`,
      );

      return {
        success: true,
        message: `Sync completed for borrower ${borrowerId}: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails,
        total: creditApplications.length,
        borrowerId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync credit applications for borrower ${borrowerId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
