import { Controller, Get, Post } from '@nestjs/common';
import { SchoolsMigrationService } from '../services/schools-migration.service';

@Controller('schools/migration')
export class SchoolsMigrationController {
  constructor(
    private readonly schoolsMigrationService: SchoolsMigrationService,
  ) {}

  @Get('preview')
  async previewMigration() {
    return this.schoolsMigrationService.previewMigration();
  }

  @Post('run')
  async runMigration() {
    return this.schoolsMigrationService.migrateSchoolsFromSheet();
  }

  @Get('status')
  async getStatus() {
    return this.schoolsMigrationService.getMigrationStatus();
  }
}
