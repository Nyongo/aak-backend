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
import { PrincipalTranchesDbService } from '../services/principal-tranches-db.service';
import { PrincipalTranchesSyncService } from '../services/principal-tranches-sync.service';
import { CreatePrincipalTrancheDto } from '../dto/create-principal-tranche.dto';
import { UpdatePrincipalTrancheDto } from '../dto/update-principal-tranche.dto';

@Controller('jf/principal-tranches')
export class PrincipalTranchesController {
  private readonly logger = new Logger(PrincipalTranchesController.name);

  constructor(
    private readonly principalTranchesDbService: PrincipalTranchesDbService,
    private readonly principalTranchesSyncService: PrincipalTranchesSyncService,
  ) {}

  @Post()
  create(@Body() createPrincipalTrancheDto: CreatePrincipalTrancheDto) {
    this.logger.log('Creating new principal tranche');
    return this.principalTranchesDbService.create(createPrincipalTrancheDto);
  }

  @Get()
  findAll() {
    this.logger.log('Getting all principal tranches');
    return this.principalTranchesDbService.findAll();
  }

  @Get('par30')
  findPar30() {
    this.logger.log('Getting PAR 30 principal tranches');
    return this.principalTranchesDbService.findPar30Tranches();
  }

  @Get('by-direct-loan/:directLoanId')
  findByDirectLoan(@Param('directLoanId') directLoanId: string) {
    this.logger.log(
      `Getting principal tranches for direct loan: ${directLoanId}`,
    );
    return this.principalTranchesDbService.findByDirectLoanId(directLoanId);
  }

  @Get('by-loan/:loanId')
  findByLoan(@Param('loanId') loanId: string) {
    this.logger.log(`Getting principal tranches for loan: ${loanId}`);
    return this.principalTranchesDbService.findByLoanId(loanId);
  }

  @Get('by-ssl/:sslId')
  findBySsl(@Param('sslId') sslId: string) {
    this.logger.log(`Getting principal tranches for SSL ID: ${sslId}`);
    return this.principalTranchesDbService.findBySslId(sslId);
  }

  @Get('by-region/:region')
  findByRegion(@Param('region') region: string) {
    this.logger.log(`Getting principal tranches for region: ${region}`);
    return this.principalTranchesDbService.findByRegion(region);
  }

  @Get('by-loan-type/:loanType')
  findByLoanType(@Param('loanType') loanType: string) {
    this.logger.log(`Getting principal tranches for loan type: ${loanType}`);
    return this.principalTranchesDbService.findByLoanType(loanType);
  }

  @Get('by-team-leader/:teamLeader')
  findByTeamLeader(@Param('teamLeader') teamLeader: string) {
    this.logger.log(
      `Getting principal tranches for team leader: ${teamLeader}`,
    );
    return this.principalTranchesDbService.findByTeamLeader(teamLeader);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    this.logger.log(`Getting principal tranche with ID: ${id}`);
    return this.principalTranchesDbService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePrincipalTrancheDto: UpdatePrincipalTrancheDto,
  ) {
    this.logger.log(`Updating principal tranche with ID: ${id}`);
    return this.principalTranchesDbService.update(
      +id,
      updatePrincipalTrancheDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.logger.log(`Deleting principal tranche with ID: ${id}`);
    return this.principalTranchesDbService.remove(+id);
  }

  // Sync endpoints
  @Post('sync/from-sheets')
  async syncFromSheets(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(
      `Syncing principal tranches from Google Sheets: ${spreadsheetId}`,
    );
    return this.principalTranchesSyncService.syncFromGoogleSheets(
      spreadsheetId,
    );
  }

  @Post('sync/to-sheets')
  async syncToSheets(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(
      `Syncing principal tranches to Google Sheets: ${spreadsheetId}`,
    );
    return this.principalTranchesSyncService.syncToGoogleSheets(spreadsheetId);
  }

  @Get('sync/status')
  async getSyncStatus(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(`Getting sync status for spreadsheet: ${spreadsheetId}`);
    return this.principalTranchesSyncService.getSyncStatus(spreadsheetId);
  }

  @Get('sync/sheet-data')
  async getSheetData(@Query('spreadsheetId') spreadsheetId: string) {
    this.logger.log(`Getting sheet data for spreadsheet: ${spreadsheetId}`);
    return this.principalTranchesSyncService.getSheetData(spreadsheetId);
  }
}
