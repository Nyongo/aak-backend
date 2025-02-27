import { Controller, Get, Param } from '@nestjs/common';
import { AppsheetService } from '../services/app-sheet.service';

@Controller('appsheet')
export class AppsheetController {
  constructor(private readonly appsheetService: AppsheetService) {}

  @Get('data/:table')
  async getTableData(@Param('table') tableName: string) {
    return this.appsheetService.getTableData(tableName);
  }
}
