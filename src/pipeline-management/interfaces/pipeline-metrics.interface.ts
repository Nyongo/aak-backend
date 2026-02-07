export interface PipelineStageMetric {
  pipelineStage: string;
  totalPipeline: number;
  entryCount: number;
}

export interface RegionalSummaryItem {
  region: string;
  totalPipeline: number;
  entryCount: number;
  percentOfTotal: number;
}

export interface RegionalBreakdownItem {
  region: string;
  stages: Record<string, number>;
  total: number;
  entryCount: number;
}

export interface LoanProductMetric {
  product: string;
  totalLoanAmount: number;
  entryCount: number;
  percentOfTotal: number;
}

export interface DelayedStageMetric {
  stageName: string;
  entryCount: number;
  totalPipeline: number;
  /** Sum of excess time (days) over stage limit for all delayed entries in this stage */
  totalDelayDays: number;
}

export interface DelayStats {
  delayedEntryCount: number;
  totalDelayedPipeline: number;
  /** Total excess time (days) all delayed entries have been over their stage limit, summed */
  totalDelayDays: number;
  delayedByStage: DelayedStageMetric[];
}

export interface PipelineMetricsResponse {
  summary: {
    grandTotal: {
      totalPipeline: number;
      entryCount: number;
    };
    regionalSummaries: RegionalSummaryItem[];
  };
  pipelineStageMetrics: PipelineStageMetric[];
  regionalBreakdown: RegionalBreakdownItem[];
  loanProductMetrics: LoanProductMetric[];
  delayStats: DelayStats;
  generatedAt: string;
}

/** Query filters for GET /pipeline/metrics */
export interface PipelineMetricsFilters {
  status?: string;
  region?: string | string[];
  sslStaffId?: string | string[];
  product?: string | string[];
  loanStage?: string | string[];
  clientType?: string;
  dateFrom?: string; // ISO date or datetime (filters createdAt)
  dateTo?: string;   // ISO date or datetime (filters createdAt)
  /** Start of range for estimated_closing – determines which month the pipeline falls in */
  estimatedClosingFrom?: string;
  /** End of range for estimated_closing (inclusive) */
  estimatedClosingTo?: string;
}
