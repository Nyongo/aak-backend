import { Module } from '@nestjs/common';
import { SslTrackerController } from './controllers/ssl-tracker.controller';
import { SslStaffController } from './controllers/ssl-staff.controller';
import { DailyWorkPlanController } from './controllers/daily-work-plan.controller';
import { SchoolsController } from './controllers/schools.controller';
import { SslStaffService } from './services/ssl-staff.service';
import { UserMigrationService } from './services/user-migration.service';
import { SchoolsService } from './services/schools.service';
import { SchoolsMigrationService } from './services/schools-migration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JfModule } from '../jf/jf.module';
import { CommonModule } from '../common/common.module';
import { SchoolsMigrationController } from './controllers/schools-migration.controller';

@Module({
  imports: [PrismaModule, JfModule, CommonModule],
  controllers: [
    SslTrackerController,
    SslStaffController,
    DailyWorkPlanController,
    SchoolsController,
    SchoolsMigrationController,
  ],
  providers: [
    SslStaffService,
    UserMigrationService,
    SchoolsService,
    SchoolsMigrationService,
  ],
  exports: [
    SslStaffService,
    UserMigrationService,
    SchoolsService,
    SchoolsMigrationService,
  ],
})
export class SslTrackerModule {}
