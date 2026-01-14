import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as https from 'https';

export interface MigrationResult {
  name: string;
  success: boolean;
  imported?: number;
  skipped?: number;
  errors?: number;
  error?: string;
  duration?: number;
}

@Injectable()
export class MigrationSchedulerService {
  private readonly logger = new Logger(MigrationSchedulerService.name);
  private readonly baseUrl: string;

  // List of all migration endpoints
  private readonly migrations = [
    { name: 'Borrowers', endpoint: '/jf/borrowers-migration/full-migration' },
    { name: 'Schools', endpoint: '/schools/migration/run' },
    { name: 'Staffs', endpoint: '/staff/migration/run' },
    { name: 'Directors', endpoint: '/jf/directors-migration/full-migration' },
    {
      name: 'CRB Consents',
      endpoint: '/jf/crb-consents-migration/full-migration',
    },
    { name: 'Referrers', endpoint: '/jf/referrers-migration/full-migration' },
    {
      name: 'Credit Applications',
      endpoint: '/jf/credit-applications-migration/full-migration',
    },
    {
      name: 'Active Debts',
      endpoint: '/jf/active-debts-migration/full-migration',
    },
    { name: 'Fee Plans', endpoint: '/jf/fee-plans-migration/full-migration' },
    { name: 'Payroll', endpoint: '/jf/payroll-migration/full-migration' },
    {
      name: 'Enrollment Verification',
      endpoint: '/jf/enrollment-verification-migration/full-migration',
    },
    {
      name: 'Mpesa Bank Statements',
      endpoint: '/jf/mpesa-bank-statement-migration/full-migration',
    },
    {
      name: 'Audited Financials',
      endpoint: '/jf/audited-financials-migration/full-migration',
    },
    {
      name: 'Student Breakdown',
      endpoint: '/jf/student-breakdown-migration/full-migration',
    },
    {
      name: 'Other Supporting Docs',
      endpoint: '/jf/other-supporting-docs-migration/full-migration',
    },
    {
      name: 'Investment Committee',
      endpoint: '/jf/investment-committee-migration/full-migration',
    },
    {
      name: 'Vendor Disbursement Details',
      endpoint: '/jf/vendor-disbursement-details-migration/full-migration',
    },
    {
      name: 'Financial Surveys',
      endpoint: '/jf/financial-surveys-migration/full-migration',
    },
    {
      name: 'Home Visits',
      endpoint: '/jf/home-visits-migration/full-migration',
    },
    {
      name: 'Asset Titles',
      endpoint: '/jf/asset-titles-migration/full-migration',
    },
    {
      name: 'Contract Details',
      endpoint: '/jf/contract-details-migration/full-migration',
    },
    {
      name: 'Credit Application Comments',
      endpoint: '/jf/credit-application-comments-migration/full-migration',
    },
    {
      name: 'Direct Payment Schedules',
      endpoint: '/jf/direct-payment-schedules-migration/full-migration',
    },
    {
      name: 'Principal Tranches',
      endpoint: '/jf/principal-tranches-migration/full-migration',
    },
    {
      name: 'Direct Lending Processing',
      endpoint: '/jf/direct-lending-processing-migration/full-migration',
    },
    {
      name: 'Impact Survey',
      endpoint: '/jf/impact-survey-migration/full-migration',
    },
    { name: 'Loans', endpoint: '/jf/loans-migration/full-migration' },
    { name: 'Write Offs', endpoint: '/jf/write-offs-migration/full-migration' },
    {
      name: 'Restructurings',
      endpoint: '/jf/restructurings-migration/full-migration',
    },
  ];

  constructor(private readonly httpService: HttpService) {
    // Use API_BASE_URL environment variable
    this.baseUrl = process.env.API_BASE_URL || 'https://127.0.0.1:3000';

    if (!process.env.API_BASE_URL) {
      this.logger.warn(`API_BASE_URL not set, using default: ${this.baseUrl}`);
    }

    this.logger.log(
      `Migration Scheduler initialized. Base URL: ${this.baseUrl}`,
    );
    this.logger.log(
      `Scheduled to run hourly at minute 0 of every hour (timezone: Africa/Nairobi)`,
    );
  }

  /**
   * Run all migrations hourly
   * Cron expression: '0 * * * *' means "at minute 0 of every hour"
   */
  @Cron('0 * * * *', {
    name: 'hourly-migrations',
    timeZone: 'Africa/Nairobi', // Adjust to your timezone
  })
  async handleHourlyMigrations() {
    this.logger.log('🔄 Starting scheduled hourly migrations...');
    const startTime = Date.now();

    const results: MigrationResult[] = [];

    // Run all migrations sequentially to avoid overwhelming the system
    for (const migration of this.migrations) {
      const migrationStartTime = Date.now();
      try {
        this.logger.log(`Running migration: ${migration.name}...`);

        // Configure HTTP client for HTTPS
        // Always disable SSL certificate verification for internal calls (localhost/127.0.0.1)
        const requestConfig: any = {
          timeout: 300000, // 5 minutes timeout per migration
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // Allow self-signed certificates for internal calls
          }),
        };

        const response = await firstValueFrom(
          this.httpService.post(
            `${this.baseUrl}${migration.endpoint}`,
            {},
            requestConfig,
          ),
        );

        const duration = Date.now() - migrationStartTime;
        const data = response.data;

        if (data.success) {
          results.push({
            name: migration.name,
            success: true,
            imported: data.imported || data.import?.imported || 0,
            skipped: data.skipped || data.import?.skipped || 0,
            errors: data.errors || data.import?.errors || 0,
            duration,
          });
          this.logger.log(
            `✅ ${migration.name}: Imported ${data.imported || data.import?.imported || 0}, ` +
              `Skipped ${data.skipped || data.import?.skipped || 0}, ` +
              `Errors ${data.errors || data.import?.errors || 0} (${duration}ms)`,
          );
        } else {
          results.push({
            name: migration.name,
            success: false,
            error: data.error || data.message || 'Unknown error',
            duration,
          });
          this.logger.error(
            `❌ ${migration.name} failed: ${data.error || data.message}`,
          );
        }
      } catch (error) {
        const duration = Date.now() - migrationStartTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          name: migration.name,
          success: false,
          error: errorMessage,
          duration,
        });
        this.logger.error(`❌ ${migration.name} failed: ${errorMessage}`);
      }

      // Small delay between migrations to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const totalDuration = Date.now() - startTime;
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalImported = results.reduce(
      (sum, r) => sum + (r.imported || 0),
      0,
    );
    const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0);

    this.logger.log(
      `✅ Hourly migrations completed: ${successful} successful, ${failed} failed, ` +
        `${totalImported} total imported, ${totalErrors} total errors (${totalDuration}ms)`,
    );

    // Log summary
    this.logger.log('📊 Migration Summary:');
    results.forEach((result) => {
      if (result.success) {
        this.logger.log(
          `  ✓ ${result.name}: ${result.imported || 0} imported, ${result.errors || 0} errors`,
        );
      } else {
        this.logger.log(`  ✗ ${result.name}: ${result.error}`);
      }
    });

    return {
      success: failed === 0,
      totalMigrations: this.migrations.length,
      successful,
      failed,
      totalImported,
      totalErrors,
      duration: totalDuration,
      results,
    };
  }

  /**
   * Manually trigger all migrations (for testing or on-demand runs)
   */
  async runAllMigrationsNow() {
    this.logger.log('🔄 Manually triggering all migrations...');
    return await this.handleHourlyMigrations();
  }

  /**
   * Run a specific migration by name
   */
  async runMigrationByName(name: string) {
    const migration = this.migrations.find(
      (m) => m.name.toLowerCase() === name.toLowerCase(),
    );

    if (!migration) {
      throw new Error(`Migration "${name}" not found`);
    }

    this.logger.log(`Running migration: ${migration.name}...`);
    const startTime = Date.now();

    try {
      // Configure HTTP client for HTTPS
      // Always disable SSL certificate verification for internal calls
      const requestConfig: any = {
        timeout: 300000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // Allow self-signed certificates for internal calls
        }),
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}${migration.endpoint}`,
          {},
          requestConfig,
        ),
      );

      const duration = Date.now() - startTime;
      return {
        success: response.data.success,
        data: response.data,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Migration ${migration.name} failed: ${errorMessage}`);
      throw error;
    }
  }
}
