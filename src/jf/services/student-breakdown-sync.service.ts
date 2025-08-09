import { Injectable, Logger } from '@nestjs/common';
import { StudentBreakdownDbService } from './student-breakdown-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class StudentBreakdownSyncService {
  private readonly logger = new Logger(StudentBreakdownSyncService.name);

  constructor(
    private readonly studentBreakdownDbService: StudentBreakdownDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all student breakdowns to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log('Syncing all student breakdowns to Google Sheets');

    try {
      const studentBreakdowns = await this.studentBreakdownDbService.findAll();

      if (studentBreakdowns.length === 0) {
        return {
          success: true,
          message: 'No student breakdowns found to sync',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const studentBreakdown of studentBreakdowns) {
        try {
          await this.syncStudentBreakdownById(studentBreakdown.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync student breakdown ${studentBreakdown.id}: ${error}`,
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
        `Failed to sync all student breakdowns: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single student breakdown to Google Sheets
   */
  async syncStudentBreakdownToSheet(studentBreakdown: any) {
    const creditApplicationId = studentBreakdown['Credit Application'];
    const sheetId = studentBreakdown.sheetId || studentBreakdown.ID;

    this.logger.debug(`Syncing student breakdown:`, {
      creditApplicationId,
      sheetId,
      dbId: studentBreakdown.dbId,
      synced: studentBreakdown.synced,
    });

    if (!creditApplicationId) {
      throw new Error(
        'Student breakdown has no Credit Application ID for identification',
      );
    }

    // Always try to update by sheetId if it exists (regardless of whether it's temporary)
    if (sheetId) {
      try {
        this.logger.debug(
          `Attempting to update student breakdown in sheet by sheetId: ${sheetId}`,
        );
        await this.sheetsService.updateStudentBreakdown(
          sheetId,
          studentBreakdown,
        );
        this.logger.debug(
          `Updated existing student breakdown in sheet: ${creditApplicationId} (sheetId: ${sheetId})`,
        );

        // Update the Postgres record to mark as synced
        if (studentBreakdown.dbId) {
          await this.studentBreakdownDbService.updateSyncStatus(
            studentBreakdown.dbId,
            true,
          );
          this.logger.debug(
            `Marked Postgres record ${studentBreakdown.dbId} as synced`,
          );
        }

        return; // Successfully updated, exit
      } catch (error) {
        this.logger.debug(`Failed to update by sheetId ${sheetId}: ${error}`);
        // Continue to create new record if update fails
      }
    }

    // Create new student breakdown if update failed or no sheetId exists
    if (!studentBreakdown.synced) {
      this.logger.debug(`Creating new student breakdown:`, {
        creditApplicationId: creditApplicationId,
        sheetId: sheetId,
        synced: studentBreakdown.synced,
      });

      try {
        const result =
          await this.sheetsService.addStudentBreakdown(studentBreakdown);

        this.logger.debug(
          `Created new student breakdown in sheet: ${creditApplicationId} (ID: ${result.ID})`,
        );

        // Update the Postgres record with the generated sheet ID if we have the database ID
        if (studentBreakdown.dbId && result.ID) {
          try {
            // First, update the synced status using updateSyncStatus
            await this.studentBreakdownDbService.updateSyncStatus(
              studentBreakdown.dbId,
              true,
            );
            this.logger.debug(
              `Updated Postgres record ${studentBreakdown.dbId} with synced: true`,
            );

            // Then, update the sheetId separately to avoid unique constraint violation
            const originalSheetId =
              studentBreakdown.sheetId || studentBreakdown.ID;

            // Check if the new sheetId already exists in the database
            const existingRecordWithNewSheetId =
              await this.studentBreakdownDbService.findBySheetId(result.ID);
            if (
              existingRecordWithNewSheetId &&
              existingRecordWithNewSheetId.id !== studentBreakdown.dbId
            ) {
              this.logger.warn(
                `SheetId ${result.ID} already exists in database for record ${existingRecordWithNewSheetId.id}. Skipping sheetId update to avoid unique constraint violation.`,
              );
            } else {
              await this.studentBreakdownDbService.update(originalSheetId, {
                sheetId: result.ID, // Update with the real sheet ID
              });
              this.logger.debug(
                `Updated Postgres record ${studentBreakdown.dbId} with sheetId: ${result.ID}`,
              );
            }
          } catch (error) {
            this.logger.warn(`Failed to update Postgres record: ${error}`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to create new student breakdown: ${error}`);
        throw error;
      }
    }
  }

  /**
   * Sync a single student breakdown by database ID
   */
  async syncStudentBreakdownById(
    dbId: number,
    operation?: 'create' | 'update',
  ) {
    this.logger.log(
      `Syncing single student breakdown by database ID: ${dbId} (operation: ${operation || 'unknown'})`,
    );

    try {
      // Always fetch the latest data from the database to ensure we have the most recent data
      const studentBreakdown = await this.studentBreakdownDbService.findById(
        dbId.toString(),
      );
      if (!studentBreakdown) {
        throw new Error(`Student breakdown with database ID ${dbId} not found`);
      }

      // Convert to sheet format and add database ID
      const studentBreakdownInSheetFormat =
        this.studentBreakdownDbService.convertDbToSheet(studentBreakdown);
      (studentBreakdownInSheetFormat as any).dbId = dbId;
      (studentBreakdownInSheetFormat as any).operation = operation;

      // Sync to sheet
      await this.syncStudentBreakdownToSheet(studentBreakdownInSheetFormat);

      this.logger.log(
        `Successfully synced student breakdown ${dbId} to Google Sheets`,
      );

      return {
        success: true,
        message: `Student breakdown ${dbId} synced successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync student breakdown ${dbId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync student breakdowns by credit application ID
   */
  async syncByCreditApplicationId(creditApplicationId: string) {
    this.logger.log(
      `Syncing student breakdowns by credit application ID: ${creditApplicationId}`,
    );

    try {
      const studentBreakdowns =
        await this.studentBreakdownDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (studentBreakdowns.length === 0) {
        return {
          success: true,
          message: 'No student breakdowns found for this credit application',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const studentBreakdown of studentBreakdowns) {
        try {
          await this.syncStudentBreakdownById(studentBreakdown.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync student breakdown ${studentBreakdown.id}: ${error}`,
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
        `Failed to sync student breakdowns for credit application ${creditApplicationId}: ${errorMessage}`,
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
      const studentBreakdowns = await this.sheetsService.getStudentBreakdowns();
      const exists = studentBreakdowns.some(
        (studentBreakdown) => studentBreakdown.ID === sheetId,
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
   * Find student breakdown by sheet ID in Google Sheets
   */
  private async findStudentBreakdownBySheetId(sheetId: string): Promise<any> {
    try {
      const studentBreakdowns = await this.sheetsService.getStudentBreakdowns();
      return (
        studentBreakdowns.find(
          (studentBreakdown) => studentBreakdown.ID === sheetId,
        ) || null
      );
    } catch (error) {
      this.logger.error(`Error finding student breakdown by sheetId: ${error}`);
      return null;
    }
  }

  /**
   * Find existing student breakdown in Google Sheets by creditApplicationId
   * This method is used when we have a synced record with a temporary sheetId
   * and need to find the real Google Sheets record to update it
   */
  private async findExistingStudentBreakdownInSheets(
    creditApplicationId: string,
  ): Promise<any> {
    try {
      const studentBreakdowns = await this.sheetsService.getStudentBreakdowns();

      // Log all student breakdowns for debugging
      this.logger.debug(
        `Searching through ${studentBreakdowns.length} student breakdowns in sheets for creditApplicationId: ${creditApplicationId}`,
      );

      // Log all records to see what we're working with
      studentBreakdowns.forEach((record, index) => {
        this.logger.debug(
          `Record ${index}: ID=${record.ID}, Credit Application=${record['Credit Application']}, Fee Type=${record['Fee Type']}, Grade=${record.Grade}`,
        );
      });

      // Find the most recent record for this credit application
      // We'll use the first match we find (most recent based on Created At)
      const existingRecord = studentBreakdowns.find(
        (studentBreakdown) =>
          studentBreakdown['Credit Application'] === creditApplicationId,
      );

      if (existingRecord) {
        this.logger.debug(
          `Found existing student breakdown in sheets for creditApplicationId ${creditApplicationId}: ${existingRecord.ID}`,
        );
        return existingRecord;
      }

      this.logger.debug(
        `No existing student breakdown found in sheets for creditApplicationId: ${creditApplicationId}`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error finding existing student breakdown:`, error);
      return null;
    }
  }
}
