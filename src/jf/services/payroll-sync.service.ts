import { Injectable, Logger } from '@nestjs/common';
import { PayrollDbService } from './payroll-db.service';
import { SheetsService } from './sheets.service';

@Injectable()
export class PayrollSyncService {
  private readonly logger = new Logger(PayrollSyncService.name);

  constructor(
    private readonly payrollDbService: PayrollDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Filter payroll data to only include fields that exist in the Google Sheets headers
   * This prevents creating new columns in the sheet
   */
  private filterPayrollDataForSheet(payrollData: any): any {
    // Define the expected sheet headers for payroll
    const expectedSheetHeaders = [
      'ID',
      'Credit Application ID',
      'Role',
      'Number of Employees in Role',
      'Monthly Salary',
      'Months per Year the Role is Paid',
      'Notes',
      'Total Annual Cost',
      'Created At',
      'Synced',
    ];

    const filteredData: any = {};

    // Only include fields that match the expected sheet headers
    expectedSheetHeaders.forEach((header) => {
      if (payrollData[header] !== undefined && payrollData[header] !== null) {
        filteredData[header] = payrollData[header];
      }
    });

    this.logger.debug('Filtered payroll data for sheet:', {
      original: payrollData,
      filtered: filteredData,
    });

    return filteredData;
  }

  /**
   * Sync all payroll records from Postgres to Google Sheets
   */
  async syncAllToSheets() {
    this.logger.log(
      'Starting sync of all payroll records from Postgres to Google Sheets',
    );

    try {
      // Get all payroll records from Postgres
      const payrollRecords = await this.payrollDbService.findAll();
      this.logger.log(
        `Found ${payrollRecords.length} payroll records in Postgres`,
      );

      if (payrollRecords.length === 0) {
        return {
          success: true,
          message: 'No payroll records to sync',
          synced: 0,
          errors: 0,
        };
      }

      // Convert to sheet format and add database IDs
      const payrollRecordsInSheetFormat =
        this.payrollDbService.convertDbArrayToSheet(payrollRecords);

      // Add database IDs to the payroll data for sync service
      payrollRecordsInSheetFormat.forEach((payroll, index) => {
        (payroll as any).dbId = payrollRecords[index].id;
      });

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      // Sync each payroll record
      for (const payroll of payrollRecordsInSheetFormat) {
        try {
          await this.syncPayrollToSheet(payroll);
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            payroll:
              payroll['Credit Application ID'] || payroll['Role'] || 'Unknown',
            creditApplicationId: payroll['Credit Application ID'],
            role: payroll['Role'],
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync payroll record ${payroll['Credit Application ID'] || payroll['Role']}: ${errorMessage}`,
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
        total: payrollRecords.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync payroll records: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync a single payroll record to Google Sheets
   */
  async syncPayrollToSheet(payroll: any) {
    const creditApplicationId = payroll['Credit Application ID'];
    const role = payroll['Role'];
    const sheetId = payroll.sheetId || payroll.ID;

    this.logger.debug(`Syncing payroll record:`, {
      creditApplicationId,
      role,
      sheetId,
      isValidSheetId: sheetId && sheetId !== null && !sheetId.startsWith('PR-'),
      hasTemporarySheetId: sheetId && sheetId.startsWith('PR-'),
      dbId: payroll.dbId,
    });

    // Log the full payroll object for debugging
    this.logger.debug(`Full payroll object:`, payroll);

    if (!creditApplicationId && !role) {
      throw new Error(
        'Payroll record has no Credit Application ID or Role for identification',
      );
    }

    // Check if sheetId exists and is not null and not a temporary ID
    const isValidSheetId =
      sheetId && sheetId !== null && !sheetId.startsWith('PR-');

    // Check if we have a temporary sheetId that needs to be replaced
    const hasTemporarySheetId = sheetId && sheetId.startsWith('PR-');

    // 1. If sheetId exists and is valid (not temporary), check if it exists in sheets before updating
    if (isValidSheetId) {
      const sheetIdExists = await this.checkSheetIdExists(sheetId);

      if (sheetIdExists) {
        try {
          this.logger.debug(
            `Updating payroll record in sheet by sheetId: ${sheetId}`,
          );
          this.logger.debug(`Payroll data being sent to sheets:`, payroll);
          // Filter payroll data to only include fields that exist in the sheet headers
          const filteredPayroll = this.filterPayrollDataForSheet(payroll);
          await this.sheetsService.updatePayroll(sheetId, filteredPayroll);
          this.logger.debug(
            `Updated payroll record in sheet: ${creditApplicationId || role} (sheetId: ${sheetId})`,
          );

          // Update the Postgres record to mark as synced
          if (payroll.dbId) {
            try {
              // Use the sheetId to find and update the record
              await this.payrollDbService.update(sheetId, {
                synced: true, // Mark as synced
              });
              this.logger.debug(
                `Marked Postgres record ${payroll.dbId} as synced`,
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

    // 2. If no valid sheetId, check if a record with the same creditApplicationId and role already exists
    this.logger.debug(`No valid sheetId found, checking for existing record:`, {
      creditApplicationId: creditApplicationId,
      role: role,
      sheetId: sheetId,
      dbId: payroll.dbId,
    });

    // First, try to find existing record by sheetId (if we have one, even if temporary)
    let existingPayroll = null;
    if (sheetId) {
      existingPayroll = await this.findPayrollBySheetId(sheetId);
      if (existingPayroll) {
        this.logger.debug(
          `Found existing record by sheetId: ${existingPayroll.ID}`,
        );
      }
    }

    // If not found by sheetId, try by creditApplicationId and role
    if (!existingPayroll) {
      existingPayroll = await this.findExistingPayrollInSheets(
        creditApplicationId,
        role,
      );
      if (existingPayroll) {
        this.logger.debug(
          `Found existing record by creditApplicationId/role: ${existingPayroll.ID}`,
        );
      }
    }

    if (existingPayroll) {
      // Update existing record
      try {
        this.logger.debug(
          `Found existing payroll record in sheet, updating: ${existingPayroll.ID}`,
        );
        // Filter payroll data to only include fields that exist in the sheet headers
        const filteredPayroll = this.filterPayrollDataForSheet(payroll);
        await this.sheetsService.updatePayroll(
          existingPayroll.ID,
          filteredPayroll,
        );
        this.logger.debug(
          `Updated existing payroll record in sheet: ${creditApplicationId || role} (ID: ${existingPayroll.ID})`,
        );

        // Update the Postgres record to mark as synced and update sheetId
        if (payroll.dbId) {
          try {
            // First, update the synced status using updateSyncStatus
            await this.payrollDbService.updateSyncStatus(payroll.dbId, true);
            this.logger.debug(
              `Updated Postgres record ${payroll.dbId} with synced: true`,
            );

            // Then, update the sheetId separately to avoid unique constraint violation
            const originalSheetId = payroll.sheetId || payroll.ID;
            await this.payrollDbService.update(originalSheetId, {
              sheetId: existingPayroll.ID, // Update with the real sheet ID
            });
            this.logger.debug(
              `Updated Postgres record ${payroll.dbId} with sheetId: ${existingPayroll.ID}`,
            );
          } catch (error) {
            this.logger.warn(`Failed to update Postgres record: ${error}`);
          }
        }

        return; // Successfully updated, exit
      } catch (error) {
        this.logger.error(
          `Failed to update existing payroll record ${existingPayroll.ID}: ${error}`,
        );
        throw error;
      }
    }

    // 3. If no existing record found, create new payroll record
    this.logger.debug(
      `No existing record found, creating new payroll record:`,
      {
        creditApplicationId: creditApplicationId,
        role: role,
        sheetId: sheetId,
      },
    );

    // Filter payroll data to only include fields that exist in the sheet headers
    const filteredPayroll = this.filterPayrollDataForSheet(payroll);
    const result = await this.sheetsService.addPayroll(filteredPayroll);
    this.logger.debug(
      `Added new payroll record to sheet: ${creditApplicationId || role} (ID: ${result.ID})`,
    );

    // Update the Postgres record with the generated sheet ID if we have the database ID
    if (payroll.dbId && result.ID) {
      try {
        // First, update the synced status using updateSyncStatus
        await this.payrollDbService.updateSyncStatus(payroll.dbId, true);
        this.logger.debug(
          `Updated Postgres record ${payroll.dbId} with synced: true`,
        );

        // Then, update the sheetId separately to avoid unique constraint violation
        const originalSheetId = payroll.sheetId || payroll.ID;
        await this.payrollDbService.update(originalSheetId, {
          sheetId: result.ID, // Update with the real sheet ID
        });
        this.logger.debug(
          `Updated Postgres record ${payroll.dbId} with sheetId: ${result.ID}`,
        );
      } catch (error) {
        this.logger.warn(`Failed to update Postgres record: ${error}`);
      }
    }
  }

  /**
   * Sync a single payroll record by database ID
   */
  async syncPayrollById(dbId: number) {
    this.logger.log(`Syncing single payroll record by database ID: ${dbId}`);

    try {
      // Always fetch the latest data from the database to ensure we have the most recent data
      const payroll = await this.payrollDbService.findById(dbId.toString());
      if (!payroll) {
        throw new Error(`Payroll record with database ID ${dbId} not found`);
      }

      // Convert to sheet format and add database ID
      const payrollInSheetFormat =
        this.payrollDbService.convertDbToSheet(payroll);
      (payrollInSheetFormat as any).dbId = dbId;

      // Sync to sheet
      await this.syncPayrollToSheet(payrollInSheetFormat);

      this.logger.log(
        `Successfully synced payroll record ${dbId} to Google Sheets`,
      );

      return {
        success: true,
        message: `Payroll record ${dbId} synced successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to sync payroll record ${dbId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync payroll records by credit application ID
   */
  async syncByCreditApplicationId(creditApplicationId: string) {
    this.logger.log(
      `Syncing payroll records by credit application ID: ${creditApplicationId}`,
    );

    try {
      const payrollRecords =
        await this.payrollDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      if (payrollRecords.length === 0) {
        return {
          success: true,
          message: 'No payroll records found for this credit application',
          synced: 0,
        };
      }

      let synced = 0;
      let errors = 0;

      for (const payroll of payrollRecords) {
        try {
          await this.syncPayrollById(payroll.id);
          synced++;
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync payroll record ${payroll.id}: ${error}`,
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
        `Failed to sync payroll records for credit application ${creditApplicationId}: ${errorMessage}`,
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
      const payrollRecords = await this.sheetsService.getPayroll();
      return payrollRecords.some((payroll) => payroll.ID === sheetId);
    } catch (error) {
      this.logger.error(`Error checking if sheetId exists: ${error}`);
      return false;
    }
  }

  /**
   * Find payroll record by sheet ID in Google Sheets
   */
  private async findPayrollBySheetId(sheetId: string): Promise<any> {
    try {
      const payrollRecords = await this.sheetsService.getPayroll();
      return payrollRecords.find((payroll) => payroll.ID === sheetId) || null;
    } catch (error) {
      this.logger.error(`Error finding payroll record by sheetId: ${error}`);
      return null;
    }
  }

  /**
   * Find existing payroll record in Google Sheets by creditApplicationId and role
   * For new records, we should create a new entry instead of updating existing ones
   * So we'll only look for exact matches by sheetId (for updates) or return null (for new records)
   */
  private async findExistingPayrollInSheets(
    creditApplicationId: string,
    role: string,
  ): Promise<any> {
    try {
      const payrollRecords = await this.sheetsService.getPayroll();

      // Log all payroll records for debugging
      this.logger.debug(
        `Searching through ${payrollRecords.length} payroll records in sheets`,
      );

      // For new records, we don't want to find existing records by creditApplicationId and role
      // because multiple payroll records can exist for the same credit application
      // We'll only return existing records if they have a matching sheetId (for updates)
      this.logger.debug(
        `Not looking for existing payroll record by creditApplicationId/role to allow multiple records per application. Creating new record.`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error finding existing payroll record:`, error);
      return null;
    }
  }
}
