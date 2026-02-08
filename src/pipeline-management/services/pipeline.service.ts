import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from '../../common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreatePipelineEntryDto } from '../dtos/create-pipeline-entry.dto';
import { UpdatePipelineEntryDto } from '../dtos/update-pipeline-entry.dto';
import { Prisma } from '@prisma/client';
import type {
  PipelineMetricsResponse,
  PipelineMetricsFilters,
  PipelineStageMetric,
  RegionalSummaryItem,
  RegionalBreakdownItem,
  LoanProductMetric,
  DelayStats,
  DelayedStageMetric,
} from '../interfaces/pipeline-metrics.interface';
import { getStageProgress, computeExpectedDisbursement } from '../constants/pipeline-stage-config';
import { DEFAULT_LOAN_STAGE } from '../constants/pipeline-options';

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value)
    return (value as { toNumber(): number }).toNumber();
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) return value.filter(Boolean).length ? value : undefined;
  const parts = String(value).split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  private toCreateData(
    dto: CreatePipelineEntryDto,
  ): Prisma.PipelineEntryUncheckedCreateInput {
    const now = new Date();
    const loanStage = dto.loanStage ?? DEFAULT_LOAN_STAGE;
    const amount = dto.amount ?? 0;
    const topUpAmount = dto.topUpAmount ?? 0;
    return {
      clientType: dto.clientType,
      entityName: dto.entityName,
      clientTel: dto.clientTel ?? undefined,
      sector: dto.sector ?? undefined,
      product: dto.product,
      amount,
      topUpAmount,
      isTopUp: dto.isTopUp ?? false,
      crossSellOpportunities: dto.crossSellOpportunities ?? undefined,
      sourceOfClient: dto.sourceOfClient ?? undefined,
      sslStaffId: dto.sslStaffId ?? undefined,
      region: dto.region ?? undefined,
      loanStage,
      loanStageEnteredAt: now,
      estimatedClosing: dto.estimatedClosing
        ? new Date(dto.estimatedClosing)
        : undefined,
      probabilityOfClosing: dto.probabilityOfClosing ?? undefined,
      expectedDisbursement: computeExpectedDisbursement(loanStage, amount, topUpAmount),
      status: dto.status ?? 'Active',
      comments: dto.comments ?? undefined,
    };
  }

  private withPipelineAmount<T extends { amount?: unknown; topUpAmount?: unknown }>(
    entry: T,
  ): T & { pipelineAmount: number } {
    return {
      ...entry,
      pipelineAmount: toNumber(entry.amount) + toNumber(entry.topUpAmount),
    };
  }

  private withStageProgress<T extends { loanStage: string | null; loanStageEnteredAt: Date | null }>(
    entry: T,
  ): T & { stageProgress: ReturnType<typeof getStageProgress> } {
    return {
      ...entry,
      stageProgress: getStageProgress(
        entry.loanStage,
        entry.loanStageEnteredAt,
      ),
    };
  }

  private enrichEntry<T extends { loanStage: string | null; loanStageEnteredAt: Date | null; amount?: unknown; topUpAmount?: unknown }>(
    entry: T,
  ): T & { pipelineAmount: number; stageProgress: ReturnType<typeof getStageProgress> } {
    return this.withStageProgress(this.withPipelineAmount(entry));
  }

  async create(dto: CreatePipelineEntryDto, createdById?: number) {
    try {
      const data = this.toCreateData(dto);
      const now = new Date();
      const entry = await this.prisma.pipelineEntry.create({
        data: {
          ...data,
          createdById: createdById ?? undefined,
        },
        include: { sslStaff: true },
      });

      const loanStage = data.loanStage ?? DEFAULT_LOAN_STAGE;
      await this.prisma.pipelineStageHistory.create({
        data: {
          pipelineEntryId: entry.id,
          stageName: loanStage,
          enteredAt: now,
          exitedAt: null,
          wasDelayed: false,
          delayFlag: null,
        },
      });

      const withHistory = await this.prisma.pipelineEntry.findUnique({
        where: { id: entry.id },
        include: {
          sslStaff: true,
          stageHistory: { orderBy: [{ exitedAt: 'desc' }, { id: 'desc' }] },
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Pipeline entry created successfully.',
        this.enrichEntry(withHistory!),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findAll(
    page: number = 1,
    pageSize: number = 50,
    filters: {
      search?: string;
      status?: string;
      region?: string;
      sslStaffId?: string;
      loanStage?: string;
      product?: string;
      clientType?: string;
      estimatedClosingFrom?: string;
      estimatedClosingTo?: string;
    } = {},
  ) {
    try {
      const where: Prisma.PipelineEntryWhereInput = {};

      if (filters.status) where.status = filters.status;
      if (filters.region) where.region = filters.region;
      if (filters.sslStaffId) where.sslStaffId = filters.sslStaffId;
      if (filters.loanStage) where.loanStage = filters.loanStage;
      if (filters.product) where.product = filters.product;
      if (filters.clientType) where.clientType = filters.clientType;

      if (filters.estimatedClosingFrom || filters.estimatedClosingTo) {
        where.estimatedClosing = {};
        if (filters.estimatedClosingFrom) {
          where.estimatedClosing.gte = new Date(filters.estimatedClosingFrom);
        }
        if (filters.estimatedClosingTo) {
          const to = new Date(filters.estimatedClosingTo);
          to.setHours(23, 59, 59, 999);
          where.estimatedClosing.lte = to;
        }
      }

      if (filters.search?.trim()) {
        where.OR = [
          { entityName: { contains: filters.search, mode: 'insensitive' } },
          { clientTel: { contains: filters.search, mode: 'insensitive' } },
          { comments: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const skip = (page - 1) * pageSize;
      const [rows, totalItems] = await Promise.all([
        this.prisma.pipelineEntry.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
          include: { sslStaff: true },
        }),
        this.prisma.pipelineEntry.count({ where }),
      ]);

      const data = rows.map((row) => this.enrichEntry(row));

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Pipeline entries fetched successfully.',
        { data, totalItems },
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.prisma.pipelineEntry.findUnique({
        where: { id },
        include: {
          sslStaff: true,
          stageHistory: {
            orderBy: { exitedAt: 'desc' },
          },
        },
      });

      if (!record) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Pipeline entry not found.',
          null,
        );
      }

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Pipeline entry retrieved successfully.',
        this.enrichEntry(record),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(id: number, dto: UpdatePipelineEntryDto, updatedById?: number) {
    try {
      const existing = await this.prisma.pipelineEntry.findUnique({
        where: { id },
      });

      if (!existing) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Pipeline entry not found.',
          null,
        );
      }

      const updateData: Prisma.PipelineEntryUpdateInput = {};
      if (dto.clientType !== undefined) updateData.clientType = dto.clientType;
      if (dto.entityName !== undefined) updateData.entityName = dto.entityName;
      if (dto.clientTel !== undefined) updateData.clientTel = dto.clientTel;
      if (dto.sector !== undefined) updateData.sector = dto.sector;
      if (dto.product !== undefined) updateData.product = dto.product;
      if (dto.amount !== undefined) updateData.amount = dto.amount;
      if (dto.topUpAmount !== undefined) updateData.topUpAmount = dto.topUpAmount;
      if (dto.isTopUp !== undefined) updateData.isTopUp = dto.isTopUp;
      if (dto.crossSellOpportunities !== undefined)
        updateData.crossSellOpportunities = dto.crossSellOpportunities;
      if (dto.sourceOfClient !== undefined) updateData.sourceOfClient = dto.sourceOfClient;
      if (dto.sslStaffId !== undefined) {
        updateData.sslStaff = dto.sslStaffId
          ? { connect: { id: dto.sslStaffId } }
          : { disconnect: true };
      }
      if (dto.region !== undefined) updateData.region = dto.region;
      const now = new Date();
      if (dto.loanStage !== undefined) {
        updateData.loanStage = dto.loanStage;
        if (dto.loanStage !== existing.loanStage) {
          updateData.loanStageEnteredAt = now;
          // Close current open stage row (set exited_at and final was_delayed/delay_flag)
          const openRow = await this.prisma.pipelineStageHistory.findFirst({
            where: { pipelineEntryId: id, exitedAt: null },
          });
          if (openRow) {
            const previousProgress = getStageProgress(
              existing.loanStage ?? openRow.stageName,
              existing.loanStageEnteredAt ?? openRow.enteredAt,
              now,
            );
            await this.prisma.pipelineStageHistory.update({
              where: { id: openRow.id },
              data: {
                exitedAt: now,
                wasDelayed: previousProgress.isDelayed,
                delayFlag: previousProgress.delayFlag ?? undefined,
              },
            });
          }
          // Open new stage row (cron will update was_delayed/delay_flag)
          await this.prisma.pipelineStageHistory.create({
            data: {
              pipelineEntryId: id,
              stageName: dto.loanStage,
              enteredAt: now,
              exitedAt: null,
              wasDelayed: false,
              delayFlag: null,
            },
          });
        }
      }
      if (dto.estimatedClosing !== undefined)
        updateData.estimatedClosing = new Date(dto.estimatedClosing);
      if (dto.probabilityOfClosing !== undefined)
        updateData.probabilityOfClosing = dto.probabilityOfClosing;
      if (dto.status !== undefined) updateData.status = dto.status;
      if (dto.comments !== undefined) updateData.comments = dto.comments;
      updateData.updatedById = updatedById ?? undefined;

      const recalcDisbursement =
        dto.amount !== undefined ||
        dto.topUpAmount !== undefined ||
        dto.loanStage !== undefined;
      if (recalcDisbursement) {
        const amount = (dto.amount ?? toNumber(existing.amount)) as number;
        const topUpAmount = (dto.topUpAmount ?? toNumber(existing.topUpAmount)) as number;
        const loanStage = dto.loanStage ?? existing.loanStage ?? null;
        updateData.expectedDisbursement = computeExpectedDisbursement(
          loanStage,
          amount,
          topUpAmount,
        );
      }

      const updated = await this.prisma.pipelineEntry.update({
        where: { id },
        data: updateData,
        include: {
          sslStaff: true,
          stageHistory: { orderBy: { exitedAt: 'desc' } },
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Pipeline entry updated successfully.',
        this.enrichEntry(updated),
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async remove(id: number) {
    try {
      const record = await this.prisma.pipelineEntry.findUnique({
        where: { id },
      });

      if (!record) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Pipeline entry not found.',
          null,
        );
      }

      await this.prisma.pipelineEntry.delete({
        where: { id },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Pipeline entry deleted successfully.',
        null,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  /**
   * Aggregated metrics for pipeline reporting: summary, pipeline stage totals,
   * regional breakdown by stage, and loan product mix.
   * Supports filters: status, region(s), sslStaffId(s), product(s), loanStage(s), clientType, dateFrom, dateTo.
   */
  async getMetrics(filters: PipelineMetricsFilters = {}): Promise<PipelineMetricsResponse> {
    const where: Prisma.PipelineEntryWhereInput = {};

    where.status = filters.status ?? 'Active';

    const regionFilter = toArray(filters.region);
    if (regionFilter?.length) where.region = regionFilter.length === 1 ? regionFilter[0] : { in: regionFilter };

    const sslIds = toArray(filters.sslStaffId);
    if (sslIds?.length) where.sslStaffId = sslIds.length === 1 ? sslIds[0] : { in: sslIds };

    const products = toArray(filters.product);
    if (products?.length) where.product = products.length === 1 ? products[0] : { in: products };

    const stages = toArray(filters.loanStage);
    if (stages?.length) where.loanStage = stages.length === 1 ? stages[0] : { in: stages };

    if (filters.clientType) where.clientType = filters.clientType;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        where.createdAt.gte = from;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (filters.estimatedClosingFrom || filters.estimatedClosingTo) {
      where.estimatedClosing = {};
      if (filters.estimatedClosingFrom) {
        const from = new Date(filters.estimatedClosingFrom);
        where.estimatedClosing.gte = from;
      }
      if (filters.estimatedClosingTo) {
        const to = new Date(filters.estimatedClosingTo);
        to.setHours(23, 59, 59, 999);
        where.estimatedClosing.lte = to;
      }
    }

    const [
      byStage,
      byRegion,
      byRegionStage,
      byProduct,
      totalAgg,
      delayedRows,
    ] = await Promise.all([
      this.prisma.pipelineEntry.groupBy({
        by: ['loanStage'],
        where,
        _sum: { expectedDisbursement: true, amount: true, topUpAmount: true },
        _count: { id: true },
      }),
      this.prisma.pipelineEntry.groupBy({
        by: ['region'],
        where,
        _sum: { expectedDisbursement: true, amount: true, topUpAmount: true },
        _count: { id: true },
      }),
      this.prisma.pipelineEntry.groupBy({
        by: ['region', 'loanStage'],
        where,
        _sum: { expectedDisbursement: true, amount: true, topUpAmount: true },
        _count: { id: true },
      }),
      this.prisma.pipelineEntry.groupBy({
        by: ['product'],
        where,
        _sum: { expectedDisbursement: true, amount: true, topUpAmount: true },
        _count: { id: true },
      }),
      this.prisma.pipelineEntry.aggregate({
        where,
        _sum: { expectedDisbursement: true, amount: true, topUpAmount: true },
        _count: { id: true },
      }),
      this.prisma.pipelineStageHistory.findMany({
        where: {
          exitedAt: null,
          wasDelayed: true,
          pipelineEntry: where,
        },
        select: {
          stageName: true,
          enteredAt: true,
          pipelineEntry: {
            select: { expectedDisbursement: true, amount: true, topUpAmount: true },
          },
        },
      }),
    ]);

    const grandTotalPipeline = toNumber(totalAgg._sum?.expectedDisbursement);
    const grandTotalPipelineAmount =
      toNumber(totalAgg._sum?.amount) + toNumber(totalAgg._sum?.topUpAmount);
    const grandTotalCount = totalAgg._count?.id ?? 0;
    const averageExpectedDisbursement =
      grandTotalCount > 0 ? Math.round((grandTotalPipeline / grandTotalCount) * 100) / 100 : 0;
    const averagePipelineAmount =
      grandTotalCount > 0 ? Math.round((grandTotalPipelineAmount / grandTotalCount) * 100) / 100 : 0;

    const pipelineStageMetrics: PipelineStageMetric[] = byStage.map((row) => {
      const total = toNumber(row._sum?.expectedDisbursement);
      const pipelineAmt = toNumber(row._sum?.amount) + toNumber(row._sum?.topUpAmount);
      const count = row._count?.id ?? 0;
      return {
        pipelineStage: row.loanStage ?? 'Unassigned',
        totalPipeline: total,
        totalPipelineAmount: pipelineAmt,
        averagePipelineAmount: count > 0 ? Math.round((pipelineAmt / count) * 100) / 100 : 0,
        totalExpectedDisbursement: total,
        averageExpectedDisbursement: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
        entryCount: count,
      };
    }).sort((a, b) => b.totalPipeline - a.totalPipeline);

    const regionalSummaries: RegionalSummaryItem[] = byRegion.map((row) => {
      const total = toNumber(row._sum?.expectedDisbursement);
      const pipelineAmt = toNumber(row._sum?.amount) + toNumber(row._sum?.topUpAmount);
      const count = row._count?.id ?? 0;
      return {
        region: row.region ?? 'Unassigned',
        totalPipeline: total,
        totalPipelineAmount: pipelineAmt,
        averagePipelineAmount: count > 0 ? Math.round((pipelineAmt / count) * 100) / 100 : 0,
        totalExpectedDisbursement: total,
        averageExpectedDisbursement: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
        entryCount: count,
        percentOfTotal:
          grandTotalPipeline > 0
            ? Math.round((total / grandTotalPipeline) * 100)
            : 0,
      };
    }).sort((a, b) => b.totalPipeline - a.totalPipeline);

    const stagesMap = new Map<string, number>();
    byRegionStage.forEach((row) => {
      const stage = row.loanStage ?? 'Unassigned';
      const key = `${row.region ?? 'Unassigned'}|${stage}`;
      stagesMap.set(key, toNumber(row._sum?.expectedDisbursement));
    });

    const regions = [...new Set(byRegionStage.map((r) => r.region ?? 'Unassigned'))].sort();
    const stageNames = [...new Set(byStage.map((s) => s.loanStage ?? 'Unassigned'))].sort();

    const regionalBreakdown: RegionalBreakdownItem[] = regions.map((region) => {
      const stages: Record<string, number> = {};
      let total = 0;
      stageNames.forEach((stage) => {
        const val = stagesMap.get(`${region}|${stage}`) ?? 0;
        stages[stage] = val;
        total += val;
      });
      const regionRow = byRegion.find((r) => (r.region ?? 'Unassigned') === region);
      const entryCount = regionRow?._count?.id ?? 0;
      return { region, stages, total, entryCount };
    });

    const loanProductMetrics: LoanProductMetric[] = byProduct.map((row) => {
      const total = toNumber(row._sum?.expectedDisbursement);
      const pipelineAmt = toNumber(row._sum?.amount) + toNumber(row._sum?.topUpAmount);
      const count = row._count?.id ?? 0;
      return {
        product: row.product,
        totalLoanAmount: total,
        totalPipelineAmount: pipelineAmt,
        averagePipelineAmount: count > 0 ? Math.round((pipelineAmt / count) * 100) / 100 : 0,
        totalExpectedDisbursement: total,
        averageExpectedDisbursement: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
        entryCount: count,
        percentOfTotal:
          grandTotalPipeline > 0 ? Math.round((total / grandTotalPipeline) * 100) : 0,
      };
    }).sort((a, b) => b.totalLoanAmount - a.totalLoanAmount);

    const now = new Date();
    const delayedByStageMap = new Map<
      string,
      { count: number; total: number; pipelineAmt: number; delayDays: number }
    >();
    let totalDelayedPipeline = 0;
    let totalDelayedPipelineAmount = 0;
    let totalDelayDays = 0;
    for (const row of delayedRows) {
      const amt = toNumber(row.pipelineEntry?.expectedDisbursement);
      const pipelineAmt =
        toNumber(row.pipelineEntry?.amount) + toNumber(row.pipelineEntry?.topUpAmount);
      totalDelayedPipeline += amt;
      totalDelayedPipelineAmount += pipelineAmt;
      const stage = row.stageName;
      const progress = getStageProgress(stage, row.enteredAt, now);
      const delayDays = Math.max(0, progress.daysInCurrentStage - progress.maxDaysInStage);
      totalDelayDays += delayDays;
      const existing = delayedByStageMap.get(stage) ?? {
        count: 0,
        total: 0,
        pipelineAmt: 0,
        delayDays: 0,
      };
      delayedByStageMap.set(stage, {
        count: existing.count + 1,
        total: existing.total + amt,
        pipelineAmt: existing.pipelineAmt + pipelineAmt,
        delayDays: existing.delayDays + delayDays,
      });
    }
    const delayedByStage: DelayedStageMetric[] = [...delayedByStageMap.entries()]
      .map(([stageName, { count, total, pipelineAmt, delayDays }]) => ({
        stageName,
        entryCount: count,
        totalPipeline: total,
        totalPipelineAmount: pipelineAmt,
        averagePipelineAmount: count > 0 ? Math.round((pipelineAmt / count) * 100) / 100 : 0,
        totalExpectedDisbursement: total,
        averageExpectedDisbursement: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
        totalDelayDays: Math.round(delayDays * 1e6) / 1e6,
      }))
      .sort((a, b) => b.entryCount - a.entryCount);

    const delayStats: DelayStats = {
      delayedEntryCount: delayedRows.length,
      totalDelayedPipeline,
      totalPipelineAmount: totalDelayedPipelineAmount,
      averagePipelineAmount:
        delayedRows.length > 0
          ? Math.round((totalDelayedPipelineAmount / delayedRows.length) * 100) / 100
          : 0,
      totalExpectedDisbursement: totalDelayedPipeline,
      averageExpectedDisbursement:
        delayedRows.length > 0
          ? Math.round((totalDelayedPipeline / delayedRows.length) * 100) / 100
          : 0,
      totalDelayDays: Math.round(totalDelayDays * 1e6) / 1e6,
      delayedByStage,
    };

    return {
      summary: {
        grandTotal: {
          totalPipeline: grandTotalPipeline,
          totalPipelineAmount: grandTotalPipelineAmount,
          averagePipelineAmount,
          totalExpectedDisbursement: grandTotalPipeline,
          averageExpectedDisbursement,
          entryCount: grandTotalCount,
        },
        regionalSummaries,
      },
      pipelineStageMetrics,
      regionalBreakdown,
      loanProductMetrics,
      delayStats,
      generatedAt: new Date().toISOString(),
    };
  }
}
