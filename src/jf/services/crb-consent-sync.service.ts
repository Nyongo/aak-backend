import { Injectable, Logger } from '@nestjs/common';
import { CrbConsentDbService } from './crb-consent-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class CrbConsentSyncService {
  private readonly logger = new Logger(CrbConsentSyncService.name);

  constructor(
    private readonly crbConsentDbService: CrbConsentDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all CRB consents from Postgres to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log(
      'Starting sync of all CRB consents from Postgres to Google Sheets',
    );

    try {
      // Get all CRB consents from Postgres
      const consents = await this.crbConsentDbService.findAll();
      this.logger.log(`Found ${consents.length} CRB consents in Postgres`);

      if (consents.length === 0) {
        return {
          success: true,
          message: 'No CRB consents to sync',
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const consentsInSheetFormat =
        this.crbConsentDbService.convertDbArrayToSheet(consents);

      // Add database IDs to the consent data for sync service
      consentsInSheetFormat.forEach((consent, index) => {
        (consent as any).dbId = consents[index].id;
      });

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each consent
      for (const consent of consentsInSheetFormat) {
        try {
          await this.syncConsentToSheet(consent);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            consent:
              consent['Signed By Name'] || consent['Borrower ID'] || 'Unknown',
            borrowerId: consent['Borrower ID'],
            signedByName: consent['Signed By Name'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync CRB consent ${consent['Signed By Name'] || consent['Borrower ID']}: ${errorMessage}`,
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
        total: consents.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync CRB consents: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single CRB consent to Google Sheets
   */
  async syncConsentToSheet(consent: any) {
    const borrowerId = consent['Borrower ID'];
    const signedByName = consent['Signed By Name'];
    const sheetId = consent.sheetId || consent.ID;

    this.logger.debug(`Syncing CRB consent:`, {
      borrowerId,
      signedByName,
      sheetId,
      isValidSheetId: sheetId && sheetId !== null,
      hasTemporarySheetId: sheetId && sheetId.startsWith('CRB-'),
    });

    if (!borrowerId && !signedByName) {
      throw new Error(
        'CRB consent has no Borrower ID or Signed By Name for identification',
      );
    }

    // Treat all sheetIds as permanent, including temporary ones
    const isValidSheetId = sheetId && sheetId !== null;

    // 1. If sheetId exists, check if it exists in sheets before updating
    if (isValidSheetId) {
      const sheetIdExists = await this.checkSheetIdExists(sheetId);

      if (sheetIdExists) {
        try {
          this.logger.debug(
            `Updating CRB consent in sheet by sheetId: ${sheetId}`,
          );
          this.logger.debug(`Consent data being sent to sheets:`, consent);
          await this.sheetsService.updateCrbConsent(sheetId, consent);
          this.logger.debug(
            `Updated CRB consent in sheet: ${borrowerId || signedByName} (sheetId: ${sheetId})`,
          );

          // Update the Postgres record to mark as synced
          if (consent.dbId) {
            try {
              await this.crbConsentDbService.update(consent.dbId.toString(), {
                synced: true, // Mark as synced
              });
              this.logger.debug(
                `Marked Postgres record ${consent.dbId} as synced`,
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

    // 2. If we have a temporary sheetId, always create a new record
    // This allows multiple CRB consents for the same director
    if (sheetId && sheetId.startsWith('CRB-')) {
      this.logger.debug(
        `Temporary sheetId detected, creating new CRB consent:`,
        {
          borrowerId: borrowerId,
          signedByName: signedByName,
          sheetId: sheetId,
        },
      );

      let result;
      // Use our temporary sheetId as the permanent ID in the sheet
      this.logger.debug(
        `Creating new CRB consent with temporary sheetId as permanent ID: ${sheetId}`,
      );
      result = await this.sheetsService.addCrbConsentWithId(consent, sheetId);

      this.logger.debug(
        `Added new CRB consent to sheet: ${borrowerId || signedByName} (ID: ${result.ID})`,
      );

      // Update the Postgres record with the final sheet ID if we have the database ID
      if (consent.dbId && result.ID) {
        try {
          // If we used a temporary sheetId, it should now be the permanent ID
          if (result.ID !== sheetId) {
            await this.crbConsentDbService.updateSheetId(
              consent.dbId,
              result.ID,
            );
            this.logger.debug(
              `Updated sheetId in database from ${sheetId} to ${result.ID}`,
            );
          }

          // Mark as synced
          await this.crbConsentDbService.updateSyncStatus(consent.dbId, true);
          this.logger.debug(`Marked Postgres record ${consent.dbId} as synced`);
        } catch (error) {
          this.logger.warn(
            `Failed to update sheetId or mark Postgres record as synced: ${error}`,
          );
        }
      }
      return; // Successfully created, exit
    }

    // 3. If no valid sheetId and no temporary sheetId, check for existing records
    this.logger.debug(`No valid sheetId found, checking for existing record:`, {
      borrowerId: borrowerId,
      signedByName: signedByName,
      sheetId: sheetId,
    });

    // Check if a record with the same borrowerId and signedByName already exists in sheets
    const existingConsent = await this.findExistingConsentInSheets(
      borrowerId,
      signedByName,
    );

    if (existingConsent) {
      // Update existing record
      try {
        this.logger.debug(
          `Found existing CRB consent in sheet, updating: ${existingConsent.ID}`,
        );
        await this.sheetsService.updateCrbConsent(existingConsent.ID, consent);
        this.logger.debug(
          `Updated existing CRB consent in sheet: ${borrowerId || signedByName} (ID: ${existingConsent.ID})`,
        );

        // Update the Postgres record to mark as synced
        if (consent.dbId) {
          try {
            await this.crbConsentDbService.updateSyncStatus(consent.dbId, true);
            this.logger.debug(
              `Marked Postgres record ${consent.dbId} as synced`,
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
          `Failed to update existing consent ${existingConsent.ID}: ${error}`,
        );
        throw error;
      }
    }

    // 4. If no existing record found, create new consent
    this.logger.debug(`No existing record found, creating new CRB consent:`, {
      borrowerId: borrowerId,
      signedByName: signedByName,
      sheetId: sheetId,
    });

    let result;
    if (sheetId) {
      // Use our sheetId as the permanent ID in the sheet
      this.logger.debug(
        `Creating new CRB consent with sheetId as permanent ID: ${sheetId}`,
      );
      result = await this.sheetsService.addCrbConsentWithId(consent, sheetId);
    } else {
      // If no sheetId, let Google Sheets handle ID generation
      result = await this.sheetsService.addCrbConsent(consent);
    }

    this.logger.debug(
      `Added new CRB consent to sheet: ${borrowerId || signedByName} (ID: ${result.ID})`,
    );

    // Update the Postgres record with the final sheet ID if we have the database ID
    if (consent.dbId && result.ID) {
      try {
        // If we used a sheetId, it should now be the permanent ID
        if (result.ID !== sheetId) {
          await this.crbConsentDbService.updateSheetId(consent.dbId, result.ID);
          this.logger.debug(
            `Updated sheetId in database from ${sheetId} to ${result.ID}`,
          );
        }

        // Mark as synced
        await this.crbConsentDbService.updateSyncStatus(consent.dbId, true);
        this.logger.debug(`Marked Postgres record ${consent.dbId} as synced`);
      } catch (error) {
        this.logger.warn(
          `Failed to update sheetId or mark Postgres record as synced: ${error}`,
        );
      }
    }
  }

  /**
   * Sync a single CRB consent by database ID
   */
  async syncConsentById(dbId: number) {
    this.logger.log(`Syncing single CRB consent by database ID: ${dbId}`);

    try {
      // Always fetch the latest data from the database to ensure we have the most recent file URLs
      const consent = await this.crbConsentDbService.findById(dbId.toString());

      if (!consent) {
        return {
          success: false,
          error: `CRB consent with database ID ${dbId} not found`,
        };
      }

      this.logger.debug(`Fetched latest consent data from database:`, consent);

      const consentInSheetFormat =
        this.crbConsentDbService.convertDbArrayToSheet([consent])[0];

      // Add the database ID to the consent data for sync service
      (consentInSheetFormat as any).dbId = consent.id;

      try {
        await this.syncConsentToSheet(consentInSheetFormat);

        return {
          success: true,
          message: `CRB consent ${consent.signedByName} synced successfully`,
          synced: 1,
          errors: 0,
          consent: consentInSheetFormat,
        };
      } catch (syncError) {
        const errorMessage =
          syncError instanceof Error ? syncError.message : String(syncError);
        this.logger.error(
          `Failed to sync CRB consent ${consent.signedByName}: ${errorMessage}`,
        );

        // Mark as unsynced if sync fails
        try {
          await this.crbConsentDbService.updateSyncStatus(consent.id, false);
          this.logger.debug(
            `Marked Postgres record ${consent.id} as unsynced due to sync failure`,
          );
        } catch (updateError) {
          this.logger.warn(
            `Failed to mark Postgres record as unsynced: ${updateError}`,
          );
        }

        return {
          success: false,
          error: errorMessage,
          consent: consentInSheetFormat,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync CRB consent by ID ${dbId}: ${errorMessage}`,
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
      const consents = await this.sheetsService.getCrbConsents();
      const exists = consents.some((consent) => consent.ID === sheetId);
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
   * Find existing consent in Google Sheets by borrowerId and signedByName
   */
  private async findExistingConsentInSheets(
    borrowerId: string,
    signedByName: string,
  ): Promise<any> {
    try {
      const consents = await this.sheetsService.getCrbConsents();
      const existingConsent = consents.find((consent) => {
        const matchesBorrowerId = consent['Borrower ID'] === borrowerId;
        const matchesSignedByName = consent['Signed By Name'] === signedByName;
        return matchesBorrowerId && matchesSignedByName;
      });

      this.logger.debug(
        `Looking for existing consent with borrowerId: ${borrowerId}, signedByName: ${signedByName}, found: ${existingConsent ? existingConsent.ID : 'none'}`,
      );
      return existingConsent || null;
    } catch (error) {
      this.logger.error(`Error finding existing consent:`, error);
      return null;
    }
  }

  /**
   * Sync CRB consents by borrower ID
   */
  async syncByBorrowerId(borrowerId: string) {
    this.logger.log(`Syncing CRB consents for borrower ID: ${borrowerId}`);

    try {
      const consents =
        await this.crbConsentDbService.findByBorrowerId(borrowerId);
      this.logger.log(
        `Found ${consents.length} CRB consents for borrower ${borrowerId}`,
      );

      if (consents.length === 0) {
        return {
          success: true,
          message: `No CRB consents found for borrower ${borrowerId}`,
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const consentsInSheetFormat =
        this.crbConsentDbService.convertDbArrayToSheet(consents);

      // Add database IDs to the consent data for sync service
      consentsInSheetFormat.forEach((consent, index) => {
        (consent as any).dbId = consents[index].id;
      });

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each consent
      for (const consent of consentsInSheetFormat) {
        try {
          await this.syncConsentToSheet(consent);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            consent:
              consent['Signed By Name'] || consent['Borrower ID'] || 'Unknown',
            borrowerId: consent['Borrower ID'],
            signedByName: consent['Signed By Name'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync CRB consent ${consent['Signed By Name'] || consent['Borrower ID']}: ${errorMessage}`,
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
        total: consents.length,
        borrowerId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync CRB consents for borrower ${borrowerId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
