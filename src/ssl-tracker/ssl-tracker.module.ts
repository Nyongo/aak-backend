import { Module } from '@nestjs/common';
import { SslTrackerController } from './controllers/ssl-tracker.controller';
import { SslStaffController } from './controllers/ssl-staff.controller';
import { DailyWorkPlanController } from './controllers/daily-work-plan.controller';
import { SslStaffService } from './services/ssl-staff.service';
import { UserMigrationService } from './services/user-migration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JfModule } from '../jf/jf.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, JfModule, CommonModule],
  controllers: [
    SslTrackerController,
    SslStaffController,
    DailyWorkPlanController,
  ],
  providers: [SslStaffService, UserMigrationService],
  exports: [SslStaffService, UserMigrationService],
})
export class SslTrackerModule {}
