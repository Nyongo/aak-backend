import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Logger,
} from '@nestjs/common';
import { LoansService } from '../services/loans.service';
import { CreateLoanDto } from '../dto/create-loan.dto';
import { UpdateLoanDto } from '../dto/update-loan.dto';

@Controller('jf/loans')
export class LoansController {
  private readonly logger = new Logger(LoansController.name);

  constructor(private readonly loansService: LoansService) {}

  @Post()
  async create(@Body() createLoanDto: CreateLoanDto) {
    this.logger.log('Creating new loan');
    try {
      const loan = await this.loansService.create(createLoanDto);
      return {
        success: true,
        data: loan,
        source: 'postgres',
        message: 'Loan created successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create loan: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get()
  async findAll(
    @Query('borrowerId') borrowerId?: string,
    @Query('sslId') sslId?: string,
    @Query('status') status?: string,
    @Query('riskCategory') riskCategory?: string,
    @Query('region') region?: string,
    @Query('loanType') loanType?: string,
    @Query('par') par?: string,
    @Query('overdue') overdue?: string,
    @Query('fullyPaid') fullyPaid?: string,
    @Query('restructured') restructured?: string,
    @Query('referral') referral?: string,
    @Query('catalyzeEligible') catalyzeEligible?: string,
    @Query('highRisk') highRisk?: string,
  ) {
    this.logger.log('Getting loans with filters');

    try {
      const filters: any = {};

      // Only add filters that are actually provided
      if (borrowerId) filters.borrowerId = borrowerId;
      if (sslId) filters.sslId = sslId;
      if (status) filters.status = status;
      if (riskCategory) filters.riskCategory = riskCategory;
      if (region) filters.region = region;
      if (loanType) filters.loanType = loanType;
      if (par) filters.par = parseInt(par, 10);
      if (overdue !== undefined) filters.overdue = overdue === 'true';
      if (fullyPaid !== undefined) filters.fullyPaid = fullyPaid === 'true';
      if (restructured !== undefined)
        filters.restructured = restructured === 'true';
      if (referral !== undefined) filters.referral = referral === 'true';
      if (catalyzeEligible !== undefined)
        filters.catalyzeEligible = catalyzeEligible === 'true';
      if (highRisk !== undefined) filters.highRisk = highRisk === 'true';

      const result = await this.loansService.findAllWithFilters(filters);

      return {
        success: true,
        data: result.data,
        source: 'postgres',
        total: result.total,
        filters: result.filters,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get loans: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('summary')
  async getLoansSummary() {
    this.logger.log('Getting loans summary');
    try {
      const summary = await this.loansService.getLoansSummary();
      return {
        success: true,
        data: summary,
        source: 'postgres',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get loans summary: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`Getting loan with ID: ${id}`);
    try {
      const loan = await this.loansService.findOne(+id);
      return {
        success: true,
        data: loan,
        source: 'postgres',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get loan with ID ${id}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateLoanDto: UpdateLoanDto) {
    this.logger.log(`Updating loan with ID: ${id}`);
    try {
      const loan = await this.loansService.update(+id, updateLoanDto);
      return {
        success: true,
        data: loan,
        source: 'postgres',
        message: 'Loan updated successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update loan with ID ${id}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting loan with ID: ${id}`);
    try {
      const loan = await this.loansService.remove(+id);
      return {
        success: true,
        data: loan,
        source: 'postgres',
        message: 'Loan deleted successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete loan with ID ${id}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}
