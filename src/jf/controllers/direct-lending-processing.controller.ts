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
import { DirectLendingProcessingDbService } from '../services/direct-lending-processing-db.service';
import { DirectLendingProcessingSyncService } from '../services/direct-lending-processing-sync.service';
import { CreateDirectLendingProcessingDto } from '../dto/create-direct-lending-processing.dto';
import { UpdateDirectLendingProcessingDto } from '../dto/update-direct-lending-processing.dto';

@Controller('jf/direct-lending-processing')
export class DirectLendingProcessingController {
  private readonly logger = new Logger(
    DirectLendingProcessingController.name,
  );

  constructor(
    private readonly directLendingProcessingDbService: DirectLendingProcessingDbService,
    private readonly directLendingProcessingSyncService: DirectLendingProcessingSyncService,
  ) {}

  @Post()
  create(
    @Body() createDirectLendingProcessingDto: CreateDirectLendingProcessingDto,
  ) {
    this.logger.log('Creating new direct lending processing record');
    return this.directLendingProcessingDbService.create(
      createDirectLendingProcessingDto,
    );
  }

  @Get()
  findAll() {
    this.logger.log('Getting all direct lending processing records');
    return this.directLendingProcessingDbService.findAll();
  }

  @Get('by-direct-loan/:directLoanId')
  findByDirectLoan(@Param('directLoanId') directLoanId: string) {
    this.logger.log(
      `Getting direct lending processing for direct loan: ${directLoanId}`,
    );
    return this.directLendingProcessingDbService.findByDirectLoanId(
      directLoanId,
    );
  }

  @Get('by-borrower/:borrowerId')
  findByBorrower(@Param('borrowerId') borrowerId: string) {
    this.logger.log(
      `Getting direct lending processing for borrower: ${borrowerId}`,
    );
    return this.directLendingProcessingDbService.findByBorrowerId(borrowerId);
  }

  @Get('by-payment-schedule/:paymentScheduleId')
  findByPaymentSchedule(@Param('paymentScheduleId') paymentScheduleId: string) {
    this.logger.log(
      `Getting direct lending processing for payment schedule: ${paymentScheduleId}`,
    );
    return this.directLendingProcessingDbService.findByPaymentScheduleId(
      paymentScheduleId,
    );
  }

  @Get('by-ssl/:sslId')
  findBySsl(@Param('sslId') sslId: string) {
    this.logger.log(
      `Getting direct lending processing for SSL ID: ${sslId}`,
    );
    return this.directLendingProcessingDbService.findBySslId(sslId);
  }

  @Get('by-region/:region')
  findByRegion(@Param('region') region: string) {
    this.logger.log(
      `Getting direct lending processing for region: ${region}`,
    );
    return this.directLendingProcessingDbService.findByRegion(region);
  }

  @Get('by-payment-type/:paymentType')
  findByPaymentType(@Param('paymentType') paymentType: string) {
    this.logger.log(
      `Getting direct lending processing for payment type: ${paymentType}`,
    );
    return this.directLendingProcessingDbService.findByPaymentType(
      paymentType,
    );
  }

  @Get('by-payment-source/:paymentSource')
  findByPaymentSource(@Param('paymentSource') paymentSource: string) {
    this.logger.log(
      `Getting direct lending processing for payment source: ${paymentSource}`,
    );
    return this.directLendingProcessingDbService.findByPaymentSource(
      paymentSource,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    this.logger.log(
      `Getting direct lending processing record with ID: ${id}`,
    );
    return this.directLendingProcessingDbService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDirectLendingProcessingDto: UpdateDirectLendingProcessingDto,
  ) {
    this.logger.log(
      `Updating direct lending processing record with ID: ${id}`,
    );
    return this.directLendingProcessingDbService.update(
      +id,
      updateDirectLendingProcessingDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logger.log(
      `Deleting direct lending processing record with ID: ${id}`,
    );
    return this.directLendingProcessingDbService.remove(+id);
  }

  // Sync endpoints
  @Post('sync/from-sheets')
  async syncFromSheets(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(
      `Syncing direct lending processing from Google Sheets: ${spreadsheetId}`,
    );
    return this.directLendingProcessingSyncService.syncFromGoogleSheets(
      spreadsheetId,
    );
  }

  @Post('sync/to-sheets')
  async syncToSheets(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(
      `Syncing direct lending processing to Google Sheets: ${spreadsheetId}`,
    );
    return this.directLendingProcessingSyncService.syncToGoogleSheets(
      spreadsheetId,
    );
  }

  @Get('sync/status')
  async getSyncStatus(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(`Getting sync status for spreadsheet: ${spreadsheetId}`);
    return this.directLendingProcessingSyncService.getSyncStatus(
      spreadsheetId,
    );
  }

  @Get('sync/sheet-data')
  async getSheetData(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(
      `Getting sheet data for spreadsheet: ${spreadsheetId}`,
    );
    return this.directLendingProcessingSyncService.getSheetData(
      spreadsheetId,
    );
  }
}
