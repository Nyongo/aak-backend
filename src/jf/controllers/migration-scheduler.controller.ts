import { Controller, Get, Post, Logger, Query } from '@nestjs/common';
import { MigrationSchedulerService } from '../services/migration-scheduler.service';

@Controller('jf/migration-scheduler')
export class MigrationSchedulerController {
  private readonly logger = new Logger(MigrationSchedulerController.name);

  constructor(
    private readonly migrationSchedulerService: MigrationSchedulerService,
  ) {}

  @Post('run-all')
  async runAllMigrations() {
    this.logger.log('Manually triggering all migrations...');
    try {
      const result = await this.migrationSchedulerService.runAllMigrationsNow();
      return {
        success: true,
        message: 'All migrations completed',
        ...result,
      };
    } catch (error) {
      this.logger.error('Error running migrations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('run')
  async runMigration(@Query('name') name: string) {
    if (!name) {
      return {
        success: false,
        error: 'Migration name is required. Use ?name=Loans or ?name=Write Offs',
      };
    }

    this.logger.log(`Manually triggering migration: ${name}`);
    try {
      const result = await this.migrationSchedulerService.runMigrationByName(
        name,
      );
      return {
        success: true,
        message: `Migration ${name} completed`,
        ...result,
      };
    } catch (error) {
      this.logger.error(`Error running migration ${name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('status')
  async getSchedulerStatus() {
    return {
      success: true,
      message: 'Migration scheduler is active',
      schedule: {
        frequency: 'Hourly',
        cronExpression: '0 * * * *',
        timeZone: 'Africa/Nairobi',
        nextRun: 'At the top of every hour',
      },
      availableMigrations: [
        'Borrowers',
        'Directors',
        'CRB Consents',
        'Referrers',
        'Credit Applications',
        'Active Debts',
        'Fee Plans',
        'Payroll',
        'Enrollment Verification',
        'Mpesa Bank Statements',
        'Audited Financials',
        'Student Breakdown',
        'Other Supporting Docs',
        'Investment Committee',
        'Vendor Disbursement Details',
        'Financial Surveys',
        'Home Visits',
        'Asset Titles',
        'Contract Details',
        'Credit Application Comments',
        'Direct Payment Schedules',
        'Principal Tranches',
        'Direct Lending Processing',
        'Impact Survey',
        'Loans',
        'Write Offs',
      ],
    };
  }
}
