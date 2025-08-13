import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MlDataService {
  private readonly logger = new Logger(MlDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper method to check if a date string is from this year
   * Date format expected: "19/09/2022"
   */
  private isDateFromThisYear(dateString: string | null): boolean {
    if (!dateString) return false;

    try {
      // Parse date in format "DD/MM/YYYY"
      const [day, month, year] = dateString.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      // Check if it's a valid date
      if (isNaN(date.getTime())) return false;

      // Check if it's from this year
      const currentYear = new Date().getFullYear();
      return date.getFullYear() === currentYear;
    } catch (error) {
      this.logger.warn(`Invalid date format: ${dateString}`);
      return false;
    }
  }

  /**
   * Get credit applications from PostgreSQL for ML purposes
   * Only returns applications with status "Approved and Disbursed" or "Rejected"
   * and with application start date from this year
   */
  async getAllCreditApplications() {
    this.logger.log(
      'Fetching credit applications from PostgreSQL for ML (Approved/Disbursed and Rejected only, with totalAmountRequested, from this year)',
    );

    try {
      const applications = await this.prisma.creditApplication.findMany({
        where: {
          status: {
            in: ['Approved and Disbursed', 'Rejected'],
          },
          totalAmountRequested: {
            not: null,
          },
          applicationStartDate: {
            not: null,
          },
        },
        select: {
          sheetId: true,
          creditType: true,
          totalAmountRequested: true,
          finalAmountApprovedAndDisbursed: true,
          status: true,
          applicationStartDate: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Filter applications by this year's application start date
      const thisYearApplications = applications.filter((app) =>
        this.isDateFromThisYear(app.applicationStartDate),
      );

      const approvedCount = thisYearApplications.filter(
        (app) => app.status === 'Approved and Disbursed',
      ).length;
      const rejectedCount = thisYearApplications.filter(
        (app) => app.status === 'Rejected',
      ).length;

      this.logger.log(
        `Found ${thisYearApplications.length} credit applications for ML from this year (Approved/Disbursed: ${approvedCount}, Rejected: ${rejectedCount})`,
      );
      return thisYearApplications;
    } catch (error) {
      this.logger.error('Error fetching credit applications:', error);
      throw error;
    }
  }

  /**
   * Get a specific credit application by ID
   */
  async getCreditApplicationById(applicationId: number) {
    this.logger.log(`Fetching credit application ID: ${applicationId}`);

    try {
      const application = await this.prisma.creditApplication.findUnique({
        where: {
          id: applicationId,
          totalAmountRequested: {
            not: null,
          },
          applicationStartDate: {
            not: null,
          },
        },
        select: {
          sheetId: true,
          creditType: true,
          totalAmountRequested: true,
          finalAmountApprovedAndDisbursed: true,
          status: true,
          applicationStartDate: true,
        },
      });

      // Check if the application is from this year
      if (
        application &&
        !this.isDateFromThisYear(application.applicationStartDate)
      ) {
        this.logger.log(`Application ${applicationId} is not from this year`);
        return null;
      }

      return application;
    } catch (error) {
      this.logger.error(
        `Error fetching credit application ${applicationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get summary statistics for ML credit applications (Approved/Disbursed and Rejected only)
   */
  async getCreditApplicationsSummary() {
    this.logger.log(
      'Fetching ML credit applications summary statistics (Approved/Disbursed and Rejected only, with totalAmountRequested, from this year)',
    );

    try {
      // Get all applications first to apply year filtering
      const allApplications = await this.prisma.creditApplication.findMany({
        where: {
          status: {
            in: ['Approved and Disbursed', 'Rejected'],
          },
          totalAmountRequested: {
            not: null,
          },
          applicationStartDate: {
            not: null,
          },
        },
        select: {
          status: true,
          creditType: true,
          applicationStartDate: true,
        },
      });

      // Filter applications by this year's application start date
      const thisYearApplications = allApplications.filter((app) =>
        this.isDateFromThisYear(app.applicationStartDate),
      );

      const totalApplications = thisYearApplications.length;

      // Get status breakdown for ML-relevant statuses only (this year)
      const statusCounts = thisYearApplications.reduce(
        (acc, app) => {
          const status = app.status || 'Unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Get credit type breakdown for ML-relevant applications only (this year)
      const creditTypeCounts = thisYearApplications.reduce(
        (acc, app) => {
          const creditType = app.creditType || 'Unknown';
          acc[creditType] = (acc[creditType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        totalApplications,
        statusBreakdown: Object.entries(statusCounts).map(
          ([status, count]) => ({
            status,
            count,
          }),
        ),
        creditTypeBreakdown: Object.entries(creditTypeCounts).map(
          ([creditType, count]) => ({
            creditType,
            count,
          }),
        ),
        note: 'Summary includes only applications with status "Approved and Disbursed" or "Rejected", with totalAmountRequested values, and application start date from this year',
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Error fetching credit applications summary:', error);
      throw error;
    }
  }
}
