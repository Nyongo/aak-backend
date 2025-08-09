import { Controller, Post, Get, Query, Logger, Param } from '@nestjs/common';
import { BorrowersSyncService } from '../services/borrowers-sync.service';
import { SyncSchedulerService } from '../sync-scheduler.service';
import { BorrowersDbService } from '../services/borrowers-db.service';
import { SheetsService } from '../services/sheets.service';

@Controller('jf/borrowers-sync')
export class BorrowersSyncController {
  private readonly logger = new Logger(BorrowersSyncController.name);

  constructor(
    private readonly borrowersSyncService: BorrowersSyncService,
    private readonly syncSchedulerService: SyncSchedulerService,
    private readonly borrowersDbService: BorrowersDbService,
    private readonly sheetsService: SheetsService,
  ) {}

  /**
   * Sync all borrowers from Postgres to Google Sheets
   */
  @Post('sync-all')
  async syncAllToSheets() {
    this.logger.log('Received request to sync all borrowers to sheets');
    return this.borrowersSyncService.syncAllToSheets();
  }

  /**
   * Sync borrowers by SSL ID from Postgres to Google Sheets
   */
  @Post('sync-by-ssl')
  async syncBySslId(@Query('sslId') sslId: string) {
    if (!sslId) {
      return {
        success: false,
        error: 'SSL ID is required. Please provide ?sslId=YOUR_SSL_ID',
      };
    }

    this.logger.log(`Received request to sync borrowers for SSL ID: ${sslId}`);
    return this.borrowersSyncService.syncBySslId(sslId);
  }

  /**
   * Incremental sync - only sync new/modified borrowers
   */
  @Post('sync-incremental')
  async syncIncremental(@Query('lastSyncTime') lastSyncTime?: string) {
    this.logger.log('Received request for incremental sync');

    let lastSyncDate: Date | undefined;
    if (lastSyncTime) {
      lastSyncDate = new Date(lastSyncTime);
      if (isNaN(lastSyncDate.getTime())) {
        return {
          success: false,
          error:
            'Invalid lastSyncTime format. Use ISO date string (e.g., 2024-01-01T00:00:00Z)',
        };
      }
    }

    return this.borrowersSyncService.syncIncremental(lastSyncDate);
  }

  /**
   * Trigger manual sync via scheduler
   */
  @Post('trigger-sync')
  async triggerManualSync(
    @Query('type') type: 'full' | 'incremental' = 'incremental',
  ) {
    this.logger.log(`Received request to trigger manual sync: ${type}`);
    return this.syncSchedulerService.triggerManualSync(type);
  }

  /**
   * Test sync logic for a single borrower
   */
  @Post('test-sync/:sslId')
  async testSyncLogic(@Param('sslId') sslId: string) {
    this.logger.log(`Testing sync logic for SSL ID: ${sslId}`);

    try {
      // Get borrower from Postgres
      const borrowers = await this.borrowersDbService.findBySslId(sslId);

      if (borrowers.length === 0) {
        return {
          success: false,
          error: `No borrower found in Postgres with SSL ID: ${sslId}`,
        };
      }

      const borrower = borrowers[0];
      const borrowerInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet([borrower])[0];

      // Check if borrower exists in sheet
      const existingInSheet = await this.sheetsService.getBorrowers();
      const foundInSheet = existingInSheet.find((b) => b['SSL ID'] === sslId);

      return {
        success: true,
        postgres: {
          found: true,
          borrower: borrowerInSheetFormat,
        },
        sheet: {
          found: !!foundInSheet,
          borrower: foundInSheet || null,
        },
        syncAction: foundInSheet ? 'UPDATE' : 'CREATE',
        message: foundInSheet
          ? `Borrower exists in sheet (ID: ${foundInSheet.ID}), would UPDATE`
          : 'Borrower not found in sheet, would CREATE',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Test sync failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get sync status and statistics
   */
  @Get('status')
  async getSyncStatus() {
    this.logger.log('Received request for sync status');

    try {
      const lastSyncTime = this.syncSchedulerService.getLastSyncTime();

      return {
        success: true,
        message: 'Sync service is running',
        scheduler: {
          enabled: true,
          lastSyncTime: lastSyncTime,
          schedules: {
            'Daily Full Sync': 'Every day at 6:00 AM',
            'Every Minute Incremental Sync': 'Every minute',
          },
        },
        endpoints: {
          'POST /jf/borrowers-sync/sync-all': 'Sync all borrowers to sheets',
          'POST /jf/borrowers-sync/sync-by-ssl?sslId=...':
            'Sync borrowers by SSL ID',
          'POST /jf/borrowers-sync/sync-incremental?lastSyncTime=...':
            'Incremental sync',
          'POST /jf/borrowers-sync/trigger-sync?type=full':
            'Trigger manual full sync',
          'POST /jf/borrowers-sync/trigger-sync?type=incremental':
            'Trigger manual incremental sync (runs every minute automatically)',
        },
        usage: {
          description:
            'Use these endpoints to push data from Postgres back to Google Sheets for AppSheet consumption',
          recommendation:
            'Automatic syncs run daily at 6 AM (full) and every minute (incremental). Manual syncs available for immediate updates.',
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get sync status: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
