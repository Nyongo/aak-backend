import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BorrowersSyncService } from './services/borrowers-sync.service';

@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);
  private lastSyncTime: Date | null = null;

  constructor(private readonly borrowersSyncService: BorrowersSyncService) {}

  /**
   * Daily sync at 6:00 AM - sync all borrowers to sheets
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async dailyFullSync() {
    this.logger.log('Starting scheduled daily full sync');
    try {
      const result = await this.borrowersSyncService.syncAllToSheets();
      this.logger.log(
        `Daily sync completed: ${result.synced} synced, ${result.errors} errors`,
      );
      this.lastSyncTime = new Date();
    } catch (error) {
      this.logger.error(`Daily sync failed: ${error}`);
    }
  }

  /**
   * Hourly incremental sync - sync only new/modified borrowers
   */
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyIncrementalSync() {
    this.logger.log('Starting scheduled hourly incremental sync');
    try {
      const result = await this.borrowersSyncService.syncIncremental(
        this.lastSyncTime,
      );
      this.logger.log(
        `Hourly sync completed: ${result.synced} synced, ${result.errors} errors`,
      );
      this.lastSyncTime = new Date();
    } catch (error) {
      this.logger.error(`Hourly sync failed: ${error}`);
    }
  }

  /**
   * Manual sync trigger
   */
  async triggerManualSync(type: 'full' | 'incremental' = 'incremental') {
    this.logger.log(`Manual sync triggered: ${type}`);
    try {
      let result;
      if (type === 'full') {
        result = await this.borrowersSyncService.syncAllToSheets();
      } else {
        result = await this.borrowersSyncService.syncIncremental(
          this.lastSyncTime,
        );
      }
      this.lastSyncTime = new Date();
      return result;
    } catch (error) {
      this.logger.error(`Manual sync failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }
}
