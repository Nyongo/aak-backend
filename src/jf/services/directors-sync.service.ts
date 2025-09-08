import { Injectable, Logger } from '@nestjs/common';
import { DirectorsDbService } from './directors-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class DirectorsSyncService {
  private readonly logger = new Logger(DirectorsSyncService.name);

  constructor(
    private readonly directorsDbService: DirectorsDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all directors from Postgres to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log(
      'Starting sync of all directors from Postgres to Google Sheets',
    );

    try {
      // Get all directors from Postgres
      const directors = await this.directorsDbService.findAll();
      this.logger.log(`Found ${directors.length} directors in Postgres`);

      if (directors.length === 0) {
        return {
          success: true,
          message: 'No directors to sync',
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format
      const directorsInSheetFormat =
        this.directorsDbService.convertDbArrayToSheet(directors);

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each director
      for (const director of directorsInSheetFormat) {
        try {
          await this.syncDirectorToSheet(director);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            director: director.Name || director['Borrower ID'] || 'Unknown',
            borrowerId: director['Borrower ID'],
            name: director.Name,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync director ${director.Name || director['Borrower ID']}: ${errorMessage}`,
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
        total: directors.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync directors: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single director to Google Sheets
   */
  async syncDirectorToSheet(director: any) {
    const borrowerId = director['Borrower ID'];
    const name = director.Name;
    const sheetId = director.sheetId || director.ID; // Accept both possible keys

    this.logger.debug(`Syncing director:`, {
      borrowerId,
      name,
      sheetId,
      isValidSheetId: sheetId && sheetId !== null,
      dbId: director.dbId,
    });

    if (!borrowerId && !name) {
      throw new Error('Director has no Borrower ID or Name for identification');
    }

    // Check if sheetId exists and is not null - all sheetIds are permanent IDs
    const isValidSheetId = sheetId && sheetId !== null;

    // 1. If sheetId exists, check if it exists in sheets before updating
    if (isValidSheetId) {
      const sheetIdExists = await this.checkSheetIdExists(sheetId);

      if (sheetIdExists) {
        try {
          this.logger.debug(
            `Updating director in sheet by sheetId: ${sheetId}`,
          );
          await this.sheetsService.updateDirector(sheetId, director);
          this.logger.debug(
            `Updated director in sheet: ${borrowerId || name} (sheetId: ${sheetId})`,
          );

          // Mark as synced in Postgres after successful sync
          if (director.dbId) {
            try {
              await this.directorsDbService.updateSyncStatus(
                director.dbId,
                true,
              );
              this.logger.debug(
                `Marked Postgres record ${director.dbId} as synced`,
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
    this.logger.debug(`No valid sheetId found, creating new director:`, {
      borrowerId: borrowerId,
      name: name,
      sheetId: sheetId,
    });

    // 3. Create new director record
    const result = await this.sheetsService.addDirector(director);
    this.logger.debug(
      `Added new director to sheet: ${borrowerId || name} (ID: ${result.ID})`,
    );

    // Update the Postgres record with the generated sheet ID if we have the database ID
    if (director.dbId && result.ID) {
      try {
        await this.directorsDbService.update(director.dbId.toString(), {
          sheetId: result.ID,
        });
        this.logger.debug(
          `Updated Postgres record ${director.dbId} with sheet ID: ${result.ID}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to update Postgres record with sheet ID: ${error}`,
        );
      }
    }

    // Mark as synced in Postgres after successful sync
    if (director.dbId) {
      try {
        await this.directorsDbService.updateSyncStatus(director.dbId, true);
        this.logger.debug(`Marked Postgres record ${director.dbId} as synced`);
      } catch (error) {
        this.logger.warn(`Failed to mark Postgres record as synced: ${error}`);
      }
    }
  }

  /**
   * Sync a single director by database ID
   */
  async syncDirectorById(dbId: number) {
    this.logger.log(`Syncing single director by database ID: ${dbId}`);

    try {
      const director = await this.directorsDbService.findById(dbId.toString());

      if (!director) {
        return {
          success: false,
          error: `Director with database ID ${dbId} not found`,
        };
      }

      const directorInSheetFormat =
        this.directorsDbService.convertDbArrayToSheet([director])[0];
      (directorInSheetFormat as any).dbId = dbId;

      try {
        await this.syncDirectorToSheet(directorInSheetFormat);

        return {
          success: true,
          message: `Director ${director.name} synced successfully`,
          synced: 1,
          errors: 0,
          director: directorInSheetFormat,
        };
      } catch (syncError) {
        const errorMessage =
          syncError instanceof Error ? syncError.message : String(syncError);
        this.logger.error(
          `Failed to sync director ${director.name}: ${errorMessage}`,
        );

        // Mark as unsynced if sync fails
        try {
          await this.directorsDbService.updateSyncStatus(director.id, false);
          this.logger.debug(
            `Marked Postgres record ${director.id} as unsynced due to sync failure`,
          );
        } catch (updateError) {
          this.logger.warn(
            `Failed to mark Postgres record as unsynced: ${updateError}`,
          );
        }

        return {
          success: false,
          error: errorMessage,
          director: directorInSheetFormat,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync director by ID ${dbId}: ${errorMessage}`,
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
      const directors = await this.sheetsService.getDirectors();
      const exists = directors.some((director) => director.ID === sheetId);
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
   * Find director in sheet by name
   */
  private async findDirectorByNameInSheet(name: string) {
    try {
      const directors = await this.sheetsService.getDirectors();
      return directors.find((director) => director.Name === name);
    } catch (error) {
      this.logger.error(
        `Error finding director by name ${name} in sheet:`,
        error,
      );
      return null;
    }
  }

  /**
   * Sync directors by borrower ID
   */
  async syncByBorrowerId(borrowerId: string) {
    this.logger.log(`Syncing directors for borrower ID: ${borrowerId}`);

    try {
      const directors =
        await this.directorsDbService.findByBorrowerId(borrowerId);
      this.logger.log(
        `Found ${directors.length} directors for borrower ${borrowerId}`,
      );

      if (directors.length === 0) {
        return {
          success: true,
          message: `No directors found for borrower ${borrowerId}`,
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format
      const directorsInSheetFormat =
        this.directorsDbService.convertDbArrayToSheet(directors);

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each director
      for (const director of directorsInSheetFormat) {
        try {
          await this.syncDirectorToSheet(director);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            director: director.Name || director['Borrower ID'] || 'Unknown',
            borrowerId: director['Borrower ID'],
            name: director.Name,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync director ${director.Name || director['Borrower ID']}: ${errorMessage}`,
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
        total: directors.length,
        borrowerId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync directors for borrower ${borrowerId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
