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
import { DirectPaymentSchedulesDbService } from '../services/direct-payment-schedules-db.service';
import { DirectPaymentSchedulesSyncService } from '../services/direct-payment-schedules-sync.service';
import { CreateDirectPaymentScheduleDto } from '../dto/create-direct-payment-schedule.dto';
import { UpdateDirectPaymentScheduleDto } from '../dto/update-direct-payment-schedule.dto';

@Controller('jf/direct-payment-schedules')
export class DirectPaymentSchedulesController {
  private readonly logger = new Logger(DirectPaymentSchedulesController.name);

  constructor(
    private readonly directPaymentSchedulesDbService: DirectPaymentSchedulesDbService,
    private readonly directPaymentSchedulesSyncService: DirectPaymentSchedulesSyncService,
  ) {}

  @Post()
  create(
    @Body() createDirectPaymentScheduleDto: CreateDirectPaymentScheduleDto,
  ) {
    this.logger.log('Creating new direct payment schedule');
    return this.directPaymentSchedulesDbService.create(
      createDirectPaymentScheduleDto,
    );
  }

  @Get()
  findAll() {
    this.logger.log('Getting all direct payment schedules');
    return this.directPaymentSchedulesDbService.findAll();
  }

  @Get('overdue')
  findOverdue() {
    this.logger.log('Getting overdue payment schedules');
    return this.directPaymentSchedulesDbService.findOverdueSchedules();
  }

  @Get('upcoming')
  findUpcoming(@Query('days') days: string = '30') {
    const daysNumber = parseInt(days, 10);
    this.logger.log(
      `Getting upcoming payment schedules for next ${daysNumber} days`,
    );
    return this.directPaymentSchedulesDbService.findUpcomingSchedules(
      daysNumber,
    );
  }

  @Get('by-overdue/:overdue')
  findByPaymentOverdue(@Param('overdue') overdue: string) {
    this.logger.log(
      `Getting payment schedules with overdue status: ${overdue}`,
    );
    return this.directPaymentSchedulesDbService.findByPaymentOverdue(overdue);
  }

  @Get('by-borrower/:borrowerId')
  findByBorrower(@Param('borrowerId') borrowerId: string) {
    this.logger.log(`Getting payment schedules for borrower: ${borrowerId}`);
    return this.directPaymentSchedulesDbService.findByBorrowerId(borrowerId);
  }

  @Get('by-direct-loan/:directLoanId')
  findByDirectLoan(@Param('directLoanId') directLoanId: string) {
    this.logger.log(
      `Getting payment schedules for direct loan: ${directLoanId}`,
    );
    return this.directPaymentSchedulesDbService.findByDirectLoanId(
      directLoanId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    this.logger.log(`Getting direct payment schedule with ID: ${id}`);
    return this.directPaymentSchedulesDbService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDirectPaymentScheduleDto: UpdateDirectPaymentScheduleDto,
  ) {
    this.logger.log(`Updating direct payment schedule with ID: ${id}`);
    return this.directPaymentSchedulesDbService.update(
      +id,
      updateDirectPaymentScheduleDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logger.log(`Deleting direct payment schedule with ID: ${id}`);
    return this.directPaymentSchedulesDbService.remove(+id);
  }

  // Sync endpoints
  @Post('sync/from-sheets')
  async syncFromSheets(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(
      `Syncing direct payment schedules from Google Sheets: ${spreadsheetId}`,
    );
    return this.directPaymentSchedulesSyncService.syncFromGoogleSheets(
      spreadsheetId,
    );
  }

  @Post('sync/to-sheets')
  async syncToSheets(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(
      `Syncing direct payment schedules to Google Sheets: ${spreadsheetId}`,
    );
    return this.directPaymentSchedulesSyncService.syncToGoogleSheets(
      spreadsheetId,
    );
  }

  @Get('sync/status')
  async getSyncStatus(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(`Getting sync status for spreadsheet: ${spreadsheetId}`);
    return this.directPaymentSchedulesSyncService.getSyncStatus(spreadsheetId);
  }

  @Get('sync/sheet-data')
  async getSheetData(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(`Getting sheet data for spreadsheet: ${spreadsheetId}`);
    return this.directPaymentSchedulesSyncService.getSheetData(spreadsheetId);
  }
}
