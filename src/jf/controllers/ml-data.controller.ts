import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MlDataService } from '../services/ml-data.service';

@Controller('jf/ml-data')
export class MlDataController {
  private readonly logger = new Logger(MlDataController.name);

  constructor(private readonly mlDataService: MlDataService) {}

  /**
   * Get credit applications for ML purposes (Approved/Disbursed and Rejected only)
   * Only returns applications with application start date from this year
   * GET /jf/ml-data/applications
   */
  @Get('applications')
  async getAllApplications(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.logger.log(
      'Fetching credit applications for ML (Approved/Disbursed and Rejected only, from this year)',
    );

    try {
      // Get all applications
      const allData = await this.mlDataService.getAllCreditApplications();

      // Apply pagination if provided
      let data = allData;
      const limitNum = limit ? parseInt(limit, 10) : undefined;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      if (limitNum) {
        data = allData.slice(offsetNum, offsetNum + limitNum);
      }

      this.logger.log(
        `Returning ${data.length} applications from this year out of ${allData.length} total`,
      );

      return {
        data,
        total: allData.length,
        note: 'Only applications with application start date from this year are included',
        ...(limitNum && { limit: limitNum }),
        ...(offsetNum && { offset: offsetNum }),
      };
    } catch (error) {
      this.logger.error('Error fetching applications for ML:', error);
      throw new HttpException(
        'Failed to fetch credit applications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get credit applications with filters
   * Only returns applications with application start date from this year
   * GET /jf/ml-data/applications/filtered
   */
  @Get('applications/filtered')
  async getFilteredApplications(
    @Query('status') status?: string,
    @Query('creditType') creditType?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.logger.log(
      'Fetching filtered credit applications for ML analysis (from this year)',
    );

    try {
      // Get all data first
      const allData = await this.mlDataService.getAllCreditApplications();

      // Apply filters
      let filteredData = allData;

      if (status) {
        filteredData = filteredData.filter(
          (app) => app.status?.toLowerCase() === status.toLowerCase(),
        );
      }

      if (creditType) {
        filteredData = filteredData.filter(
          (app) => app.creditType?.toLowerCase() === creditType.toLowerCase(),
        );
      }

      if (minAmount) {
        const min = parseFloat(minAmount);
        filteredData = filteredData.filter(
          (app) => app.totalAmountRequested && app.totalAmountRequested >= min,
        );
      }

      if (maxAmount) {
        const max = parseFloat(maxAmount);
        filteredData = filteredData.filter(
          (app) => app.totalAmountRequested && app.totalAmountRequested <= max,
        );
      }

      // Apply pagination after filtering
      let data = filteredData;
      const limitNum = limit ? parseInt(limit, 10) : undefined;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      if (limitNum) {
        data = filteredData.slice(offsetNum, offsetNum + limitNum);
      }

      const appliedFilters = {
        status,
        creditType,
        minAmount,
        maxAmount,
      };

      this.logger.log(
        `Applied filters returned ${data.length} applications from this year (showing ${data.length} of ${filteredData.length} filtered from ${allData.length} total)`,
      );

      return {
        data,
        total: filteredData.length,
        totalUnfiltered: allData.length,
        filters: appliedFilters,
        note: 'Only applications with application start date from this year are included',
        ...(limitNum && { limit: limitNum }),
        ...(offsetNum && { offset: offsetNum }),
      };
    } catch (error) {
      this.logger.error('Error fetching filtered applications for ML:', error);
      throw new HttpException(
        'Failed to fetch filtered credit applications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a specific credit application by ID
   * GET /jf/ml-data/applications/:id
   */
  @Get('applications/:id')
  async getApplicationById(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Fetching credit application ID: ${id}`);

    try {
      const data = await this.mlDataService.getCreditApplicationById(id);

      if (!data) {
        throw new HttpException(
          `Credit application with ID ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error fetching application ${id} for ML:`, error);
      throw new HttpException(
        'Failed to fetch credit application',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get summary statistics for credit applications
   * GET /jf/ml-data/summary
   */
  @Get('summary')
  async getDataSummary() {
    this.logger.log('Fetching credit applications summary');

    try {
      return await this.mlDataService.getCreditApplicationsSummary();
    } catch (error) {
      this.logger.error('Error fetching credit applications summary:', error);
      throw new HttpException(
        'Failed to fetch credit applications summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
