import { Injectable, Logger } from '@nestjs/common';
import { BorrowersDbService } from './borrowers-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class BorrowersSyncService {
  private readonly logger = new Logger(BorrowersSyncService.name);

  constructor(
    private readonly borrowersDbService: BorrowersDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all borrowers from Postgres to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log(
      'Starting sync of all borrowers from Postgres to Google Sheets',
    );

    try {
      // Get all borrowers from Postgres
      const borrowers = await this.borrowersDbService.findAll();
      this.logger.log(`Found ${borrowers.length} borrowers in Postgres`);

      if (borrowers.length === 0) {
        return {
          success: true,
          message: 'No borrowers to sync',
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format
      const borrowersInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet(borrowers);

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each borrower
      for (const borrower of borrowersInSheetFormat) {
        try {
          await this.syncBorrowerToSheet(borrower);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            borrower: borrower.Name || borrower['SSL ID'] || 'Unknown',
            sslId: borrower['SSL ID'],
            name: borrower.Name,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync borrower ${borrower.Name || borrower['SSL ID']}: ${errorMessage}`,
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
        total: borrowers.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync borrowers: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single borrower to Google Sheets
   */
  async syncBorrowerToSheet(borrower: any) {
    const sslId = borrower['SSL ID'];
    const name = borrower.Name;
    const sheetId = borrower.sheetId || borrower.ID; // Accept both possible keys

    if (!sslId && !name) {
      throw new Error('Borrower has no SSL ID or Name for identification');
    }

    // 1. If sheetId exists, always update by sheetId
    if (sheetId) {
      this.logger.debug(`Updating borrower in sheet by sheetId: ${sheetId}`);
      await this.sheetsService.updateBorrower(sheetId, borrower);
      this.logger.debug(
        `Updated borrower in sheet: ${sslId || name} (sheetId: ${sheetId})`,
      );
    } else {
      // 2. Fallback: try to find by name
      let existingBorrower = null;
      if (name) {
        existingBorrower = await this.findBorrowerByNameInSheet(name);
        if (existingBorrower) {
          this.logger.debug(`Found match by name: ${name}`);
          // Verify SSL ID matches (optional check)
          if (existingBorrower['SSL ID'] !== sslId) {
            this.logger.warn(
              `Name match but SSL ID mismatch: Sheet="${existingBorrower['SSL ID']}" vs Postgres="${sslId}"`,
            );
          }
        }
      }

      if (existingBorrower) {
        // Update existing borrower using the generated ID from the sheet
        this.logger.debug(`Found existing borrower in sheet:`, {
          sslId: sslId,
          name: name,
          sheetId: existingBorrower.ID,
          sheetSslId: existingBorrower['SSL ID'],
          sheetName: existingBorrower.Name,
        });

        await this.sheetsService.updateBorrower(existingBorrower.ID, borrower);
        this.logger.debug(
          `Updated borrower in sheet: ${sslId || name} (ID: ${existingBorrower.ID})`,
        );
      } else {
        // 3. Add new borrower
        this.logger.debug(`No existing borrower found, creating new one:`, {
          sslId: sslId,
          name: name,
        });

        const result = await this.sheetsService.addBorrower(borrower);
        this.logger.debug(
          `Added new borrower to sheet: ${sslId || name} (ID: ${result.ID})`,
        );

        // Update the Postgres record with the generated sheet ID if we have the database ID
        if (borrower.dbId && result.ID) {
          try {
            await this.borrowersDbService.update(borrower.dbId.toString(), {
              sheetId: result.ID,
            });
            this.logger.debug(
              `Updated Postgres record ${borrower.dbId} with sheet ID: ${result.ID}`,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to update Postgres record with sheet ID: ${error}`,
            );
          }
        }
      }
    }

    // Mark as synced in Postgres after successful sync
    if (borrower.dbId) {
      try {
        await this.borrowersDbService.updateSyncStatus(borrower.dbId, true);
        this.logger.debug(`Marked Postgres record ${borrower.dbId} as synced`);
      } catch (error) {
        this.logger.warn(`Failed to mark Postgres record as synced: ${error}`);
      }
    }
  }

  /**
   * Sync a single borrower by database ID
   */
  async syncBorrowerById(dbId: number) {
    this.logger.log(`Syncing single borrower by database ID: ${dbId}`);

    try {
      const borrower = await this.borrowersDbService.findById(dbId.toString());

      if (!borrower) {
        return {
          success: false,
          error: `Borrower with database ID ${dbId} not found`,
        };
      }

      const borrowerInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet([borrower])[0];

      try {
        await this.syncBorrowerToSheet(borrowerInSheetFormat);

        return {
          success: true,
          message: `Borrower ${borrower.name} synced successfully`,
          synced: 1,
          errors: 0,
          borrower: borrowerInSheetFormat,
        };
      } catch (syncError) {
        const errorMessage =
          syncError instanceof Error ? syncError.message : String(syncError);
        this.logger.error(
          `Failed to sync borrower ${borrower.name}: ${errorMessage}`,
        );

        // Mark as unsynced if sync fails
        try {
          await this.borrowersDbService.updateSyncStatus(borrower.id, false);
          this.logger.debug(
            `Marked Postgres record ${borrower.id} as unsynced due to sync failure`,
          );
        } catch (updateError) {
          this.logger.warn(
            `Failed to mark Postgres record as unsynced: ${updateError}`,
          );
        }

        return {
          success: false,
          error: errorMessage,
          borrower: borrowerInSheetFormat,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync borrower by ID ${dbId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Find borrower in sheet by SSL ID and name (exact match)
   */
  private async findBorrowerBySslIdAndNameInSheet(sslId: string, name: string) {
    try {
      const borrowers = await this.sheetsService.getBorrowers();
      return borrowers.find(
        (borrower) => borrower['SSL ID'] === sslId && borrower.Name === name,
      );
    } catch (error) {
      this.logger.error(
        `Error finding borrower by SSL ID ${sslId} and name ${name} in sheet:`,
        error,
      );
      return null;
    }
  }

  /**
   * Find borrower in sheet by SSL ID (not by generated ID)
   */
  private async findBorrowerBySslIdInSheet(sslId: string) {
    try {
      const borrowers = await this.sheetsService.getBorrowers();

      // Find ALL borrowers with this SSL ID to check for duplicates
      const allMatches = borrowers.filter(
        (borrower) => borrower['SSL ID'] === sslId,
      );

      if (allMatches.length > 1) {
        this.logger.warn(
          `Found ${allMatches.length} borrowers with SSL ID ${sslId}:`,
          allMatches.map((b) => ({
            name: b.Name,
            id: b.ID,
            sslId: b['SSL ID'],
          })),
        );
      }

      // Return the first match (original behavior)
      const firstMatch = borrowers.find(
        (borrower) => borrower['SSL ID'] === sslId,
      );

      if (firstMatch) {
        this.logger.debug(`Found borrower in sheet by SSL ID ${sslId}:`, {
          name: firstMatch.Name,
          id: firstMatch.ID,
          sslId: firstMatch['SSL ID'],
          totalMatches: allMatches.length,
        });
      }

      return firstMatch;
    } catch (error) {
      this.logger.error(
        `Error finding borrower by SSL ID ${sslId} in sheet:`,
        error,
      );
      return null;
    }
  }

  /**
   * Find borrower in sheet by name
   */
  private async findBorrowerByNameInSheet(name: string) {
    try {
      const borrowers = await this.sheetsService.getBorrowers();
      return borrowers.find((borrower) => borrower.Name === name);
    } catch (error) {
      this.logger.error(
        `Error finding borrower by name ${name} in sheet:`,
        error,
      );
      return null;
    }
  }

  /**
   * Sync all schools/borrowers for a specific SSL ID (one person can have multiple schools)
   */
  async syncBySslId(sslId: string) {
    this.logger.log(`Syncing all schools for SSL ID (person): ${sslId}`);

    try {
      const borrowers = await this.borrowersDbService.findBySslId(sslId);

      if (borrowers.length === 0) {
        return {
          success: true,
          message: `No schools found for SSL ID (person): ${sslId}`,
          synced: 0,
        };
      }

      this.logger.log(`Found ${borrowers.length} schools for SSL ID ${sslId}`);

      const borrowersInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet(borrowers);

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      for (const borrower of borrowersInSheetFormat) {
        try {
          this.logger.debug(
            `Syncing school: ${borrower.Name} (SSL ID: ${sslId})`,
          );
          await this.syncBorrowerToSheet(borrower);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            borrower: borrower.Name || borrower['SSL ID'] || 'Unknown',
            sslId: borrower['SSL ID'],
            name: borrower.Name,
            error: errorMessage,
          });
        }
      }

      return {
        success: true,
        message: `Sync completed for SSL ID (person) ${sslId}: ${synced} schools synced, ${errors} errors`,
        synced,
        errors,
        errorDetails,
        total: borrowers.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync schools for SSL ID ${sslId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync only new/modified borrowers (incremental sync)
   */
  async syncIncremental(lastSyncTime?: Date) {
    this.logger.log('Starting incremental sync from Postgres to Google Sheets');

    try {
      // Get borrowers modified since last sync
      const borrowers = await this.borrowersDbService.findAll();

      // Filter by last modified time if provided
      let filteredBorrowers = borrowers;
      if (lastSyncTime) {
        filteredBorrowers = borrowers.filter(
          (borrower) =>
            borrower.createdAt && new Date(borrower.createdAt) > lastSyncTime,
        );
      }

      this.logger.log(
        `Found ${filteredBorrowers.length} borrowers to sync incrementally`,
      );

      if (filteredBorrowers.length === 0) {
        return {
          success: true,
          message: 'No new/modified borrowers to sync',
          synced: 0,
        };
      }

      const borrowersInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet(filteredBorrowers);

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      for (const borrower of borrowersInSheetFormat) {
        try {
          await this.syncBorrowerToSheet(borrower);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            borrower: borrower.Name || borrower['SSL ID'] || 'Unknown',
            error: errorMessage,
          });
        }
      }

      return {
        success: true,
        message: `Incremental sync completed: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails,
        total: filteredBorrowers.length,
        lastSyncTime: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync incrementally: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
