import { Controller, Get, Post, Logger, Query, Param } from '@nestjs/common';
import { BorrowersDbService } from '../services/borrowers-db.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/borrowers-migration')
export class BorrowersMigrationController {
  private readonly logger = new Logger(BorrowersMigrationController.name);
  private readonly BORROWERS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_BORROWERS_IMAGES_FOLDER_ID;
  private readonly SCHOOL_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_SCHOOL_IMAGES_FOLDER_ID;

  constructor(
    private readonly borrowersDbService: BorrowersDbService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('status')
  async getMigrationStatus() {
    this.logger.log('Getting migration status for Borrowers');
    try {
      // Get counts from both sources
      const sheetsData = await this.sheetsService.getBorrowers();
      const dbData = await this.borrowersDbService.findAll();

      return {
        success: true,
        status: {
          sheets: {
            total: sheetsData.length,
            sample: sheetsData.slice(0, 3).map((b) => ({
              name: b.Name,
              sslId: b['SSL ID'],
              sheetId: b.ID,
            })),
          },
          database: {
            total: dbData.length,
            synced: dbData.filter((b) => b.synced).length,
            unsynced: dbData.filter((b) => !b.synced).length,
            sample: dbData.slice(0, 3).map((b) => ({
              name: b.name,
              sslId: b.sslId,
              sheetId: b.sheetId,
              synced: b.synced,
            })),
          },
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get migration status: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Post('import-from-sheets')
  async importFromSheets(@Query('sslId') sslId?: string) {
    this.logger.log(
      `Starting import from Google Sheets${sslId ? ` for SSL ID: ${sslId}` : ''}`,
    );

    try {
      // Get data from Google Sheets
      const sheetsData = sslId
        ? await this.sheetsService.getBorrowers(sslId)
        : await this.sheetsService.getBorrowers();

      if (!sheetsData || sheetsData.length === 0) {
        return {
          success: true,
          message: 'No data found in Google Sheets',
          imported: 0,
          skipped: 0,
          errors: 0,
        };
      }

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails = [];
      const skippedDetails = [];

      // Process each borrower from sheets
      for (const sheetBorrower of sheetsData) {
        try {
          // Skip completely empty records
          if (!sheetBorrower.ID || Object.keys(sheetBorrower).length === 0) {
            this.logger.debug(
              `Skipping empty record: ${JSON.stringify(sheetBorrower)}`,
            );
            skipped++;
            skippedDetails.push({
              borrower: 'Empty Record',
              sheetId: sheetBorrower.ID || 'No ID',
              reason: 'Completely empty record in Google Sheets',
            });
            continue;
          }

          // Skip records with empty ID
          if (!sheetBorrower.ID || sheetBorrower.ID.trim() === '') {
            this.logger.debug(
              `Skipping record with empty ID: ${JSON.stringify(sheetBorrower)}`,
            );
            skipped++;
            skippedDetails.push({
              borrower: sheetBorrower.Name || 'Unknown',
              sheetId: 'Empty ID',
              reason: 'Empty ID in Google Sheets',
            });
            continue;
          }

          // Convert sheet data to database format
          const dbBorrower = this.convertSheetToDbFormat(sheetBorrower);

          // Check if borrower already exists in database
          const existingBorrower = await this.borrowersDbService.findBySheetId(
            sheetBorrower.ID,
          );

          if (existingBorrower) {
            // Update existing record
            await this.borrowersDbService.update(String(existingBorrower.id), {
              ...dbBorrower,
              synced: true, // Mark as synced since it came from sheets
            });
            updated++;
            this.logger.debug(
              `Updated existing borrower: ${sheetBorrower.Name} (ID: ${sheetBorrower.ID})`,
            );
          } else {
            // Create new record
            await this.borrowersDbService.create({
              ...dbBorrower,
              synced: true, // Mark as already synced since it came from sheets
            });
            imported++;
            this.logger.debug(
              `Created new borrower: ${sheetBorrower.Name} (ID: ${sheetBorrower.ID})`,
            );
          }
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            borrower: sheetBorrower.Name || 'Unknown',
            sheetId: sheetBorrower.ID,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to import borrower ${sheetBorrower.Name}: ${errorMessage}`,
          );
        }
      }

      return {
        success: true,
        message: 'Import completed',
        imported,
        updated,
        skipped,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
        skippedDetails: skippedDetails.length > 0 ? skippedDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to import from sheets: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Post('sync-to-sheets')
  async syncToSheets(@Query('sslId') sslId?: string) {
    this.logger.log(
      `Starting sync to Google Sheets${sslId ? ` for SSL ID: ${sslId}` : ''}`,
    );

    try {
      // Get unsynced borrowers from database
      const unsyncedBorrowers = sslId
        ? (await this.borrowersDbService.findBySslId(sslId)).filter(
            (b) => !b.synced,
          )
        : await this.borrowersDbService.findUnsynced();

      if (!unsyncedBorrowers || unsyncedBorrowers.length === 0) {
        return {
          success: true,
          message: 'No unsynced borrowers found',
          synced: 0,
          errors: 0,
        };
      }

      let synced = 0;
      let errors = 0;
      const errorDetails = [];

      // Process each unsynced borrower
      for (const dbBorrower of unsyncedBorrowers) {
        try {
          // Convert to sheet format
          const sheetBorrower = this.borrowersDbService.convertDbArrayToSheet([
            dbBorrower,
          ])[0];

          // Add to Google Sheets
          await this.sheetsService.addBorrower(sheetBorrower);

          // Mark as synced in database
          await this.borrowersDbService.updateSyncStatus(dbBorrower.id, true);

          this.logger.debug(
            `Synced borrower: ${dbBorrower.name} (ID: ${dbBorrower.id})`,
          );
          synced++;
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            borrower: dbBorrower.name || 'Unknown',
            id: dbBorrower.id,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to sync borrower ${dbBorrower.name}: ${errorMessage}`,
          );
        }
      }

      return {
        success: true,
        message: 'Sync completed',
        synced,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync to sheets: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Post('full-migration')
  async fullMigration(@Query('sslId') sslId?: string) {
    this.logger.log(
      `Starting full migration${sslId ? ` for SSL ID: ${sslId}` : ''}`,
    );

    try {
      // Step 1: Import from sheets
      const importResult = await this.importFromSheets(sslId);
      if (!importResult.success) {
        return importResult;
      }

      // Step 2: Sync to sheets
      const syncResult = await this.syncToSheets(sslId);
      if (!syncResult.success) {
        return syncResult;
      }

      return {
        success: true,
        message: 'Full migration completed',
        import: importResult,
        sync: syncResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to complete full migration: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('compare/:sheetId')
  async compareBorrower(@Param('sheetId') sheetId: string) {
    this.logger.log(`Comparing borrower with sheet ID: ${sheetId}`);

    try {
      // Get from sheets
      const sheetBorrower = await this.sheetsService.findBorrowerById(sheetId);
      if (!sheetBorrower) {
        return { success: false, error: 'Borrower not found in sheets' };
      }

      // Get from database
      const dbBorrower = await this.borrowersDbService.findBySheetId(sheetId);
      if (!dbBorrower) {
        return { success: false, error: 'Borrower not found in database' };
      }

      // Convert database borrower to sheet format for comparison
      const dbBorrowerSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet([dbBorrower])[0];

      return {
        success: true,
        comparison: {
          sheetId,
          sheets: sheetBorrower,
          database: dbBorrowerSheetFormat,
          synced: dbBorrower.synced,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compare borrower: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('debug/empty-names')
  async debugEmptyNames() {
    this.logger.log('Checking for records with empty names in Google Sheets');

    try {
      const sheetsData = await this.sheetsService.getBorrowers();
      const emptyNameRecords = sheetsData.filter(
        (record) => !record.Name || record.Name === '' || record.Name === null,
      );

      return {
        success: true,
        totalRecords: sheetsData.length,
        emptyNameRecords: emptyNameRecords.length,
        records: emptyNameRecords.slice(0, 5).map((record) => ({
          rawRecord: record,
          id: record.ID,
          name: record.Name,
          sslId: record['SSL ID'],
          type: record.Type,
          locationDescription: record['Location Description'],
          status: record.Status,
        })),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to debug empty names: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private convertSheetToDbFormat(sheetBorrower: any): any {
    // Map sheet data to database format
    const dbBorrower = {
      sheetId: sheetBorrower.ID,
      customerType: sheetBorrower['Customer Type'],
      type: sheetBorrower.Type,
      name: sheetBorrower.Name,
      locationDescription: sheetBorrower['Location Description'],
      societyCertificate: sheetBorrower['Society, CBO, or Corporation'],
      yearFounded: sheetBorrower['Year Founded'],
      sslId: sheetBorrower['SSL ID'],
      locationPin: sheetBorrower['Location Pin'],
      historicalPaymentDetails: sheetBorrower['Historical Payment Details'],
      paymentMethod: sheetBorrower['Payment Method'],
      bankName: sheetBorrower['Bank Name'],
      accountName: sheetBorrower['Account Name'],
      accountNumber: sheetBorrower['Account Number'],
      primaryPhone: sheetBorrower['Primary Phone for Borrower'],
      documentVerifyingAccount:
        sheetBorrower['Document Verifying Payment Account'],
      managerVerification: sheetBorrower['Manager Verification'],
      status: sheetBorrower.Status,
      notes: sheetBorrower.Notes,
      entityType: sheetBorrower['Society, CBO, or Corporation'],
      registrationNumber:
        sheetBorrower['Registration Number of CBO, Society, or Corporation'],
      notesOnStatus: sheetBorrower['Notes on Status'],
      officialSearch: sheetBorrower['Official Search'],
      pelezaSearch: sheetBorrower['Peleza Search'],
      productsRequested: sheetBorrower['Products Requested'],
      dataCollectionProgress: this.convertToFloat(
        sheetBorrower['Data Collection Progress'],
      ),
      initialContactNotes: sheetBorrower['Initial Contact Details and Notes'],
      kraPinPhoto: sheetBorrower['KRA PIN Photo'],
      kraPinNumber: sheetBorrower['KRA PIN Number'],
      createdBy: sheetBorrower['Created By'],
      howHeard: sheetBorrower['How did the borrower hear about Jackfruit?'],
      monthYearCreated: sheetBorrower['Month And Year Created'],
      moeCertified: sheetBorrower['Certified by the MOE?'],
      moeCertificate: sheetBorrower['MOE Certificate'],
      county: sheetBorrower.County,
      cr12: sheetBorrower.CR12,
      nationalIdNumber: sheetBorrower['National ID Number'],
      nationalIdFront: sheetBorrower['National ID Front'],
      nationalIdBack: sheetBorrower['National ID Back'],
      dateOfBirth: sheetBorrower['Date of Birth'],
      privateOrApbet: sheetBorrower['Private or APBET'],
    };

    // Remove undefined values to avoid Prisma errors
    const cleanedBorrower = {};
    for (const [key, value] of Object.entries(dbBorrower)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanedBorrower[key] = value;
      }
    }

    return cleanedBorrower;
  }

  private convertToFloat(value: any): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // Handle "#VALUE!" and other Excel errors
    if (
      typeof value === 'string' &&
      (value.includes('#') || value.includes('VALUE'))
    ) {
      return null;
    }

    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
}
