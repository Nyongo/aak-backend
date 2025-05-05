import { Controller, Get, Query } from '@nestjs/common';
import { SpreadsheetService } from '../services/spread-sheet.service';

@Controller('spreadsheet')
export class SpreadsheetController {
  constructor(private readonly spreadsheetService: SpreadsheetService) {}

  @Get('read')
  async read(@Query('spreadsheetId') spreadsheetId: string) {
    return this.spreadsheetService.readSheet(spreadsheetId);
  }

  @Get('read-dbsheet')
  async readDbsheet(@Query('spreadsheetId') spreadsheetId: string) {
    return this.spreadsheetService.readDbSheet(spreadsheetId);
  }
}
