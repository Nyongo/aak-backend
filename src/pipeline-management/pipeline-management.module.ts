import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { PipelineController } from './controllers/pipeline.controller';
import { PipelineService } from './services/pipeline.service';
import { PipelineStageDelayCronService } from './services/pipeline-stage-delay-cron.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [PipelineController],
  providers: [PipelineService, PipelineStageDelayCronService],
  exports: [PipelineService],
})
export class PipelineManagementModule {}
