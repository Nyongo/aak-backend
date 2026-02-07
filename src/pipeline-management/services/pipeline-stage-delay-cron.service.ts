import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { getStageProgress } from '../constants/pipeline-stage-config';

/**
 * Updates was_delayed and delay_flag on open pipeline_stage_history rows (current stage).
 * Runs hourly to keep delay status in sync while loan_stage hasn't changed.
 */
@Injectable()
export class PipelineStageDelayCronService {
  private readonly logger = new Logger(PipelineStageDelayCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async updateOpenStageDelays() {
    const now = new Date();
    const openRows = await this.prisma.pipelineStageHistory.findMany({
      where: { exitedAt: null },
      include: {
        pipelineEntry: {
          select: { loanStage: true, loanStageEnteredAt: true },
        },
      },
    });

    let updated = 0;
    for (const row of openRows) {
      const entry = row.pipelineEntry;
      const progress = getStageProgress(
        entry.loanStage ?? row.stageName,
        entry.loanStageEnteredAt ?? row.enteredAt,
        now,
      );
      await this.prisma.pipelineStageHistory.update({
        where: { id: row.id },
        data: {
          wasDelayed: progress.isDelayed,
          delayFlag: progress.delayFlag ?? undefined,
        },
      });
      updated++;
    }

    if (openRows.length > 0) {
      this.logger.log(
        `Pipeline stage delay cron: updated ${updated} open stage history row(s)`,
      );
    }
  }
}
