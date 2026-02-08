export interface PipelineStageMetric {
  pipelineStage: string;
  totalPipeline: number;
  /** Sum of (amount + topUpAmount) for this stage */
  totalPipelineAmount: number;
  /** totalPipelineAmount / entryCount */
  averagePipelineAmount: number;
  /** Sum of expectedDisbursement for this stage */
  totalExpectedDisbursement: number;
  /** totalExpectedDisbursement / entryCount */
  averageExpectedDisbursement: number;
  entryCount: number;
}

export interface RegionalSummaryItem {
  region: string;
  totalPipeline: number;
  /** Sum of (amount + topUpAmount) for this region */
  totalPipelineAmount: number;
  /** totalPipelineAmount / entryCount */
  averagePipelineAmount: number;
  /** Sum of expectedDisbursement for this region */
  totalExpectedDisbursement: number;
  /** totalExpectedDisbursement / entryCount */
  averageExpectedDisbursement: number;
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
  /** Sum of (amount + topUpAmount) for this product */
  totalPipelineAmount: number;
  /** totalPipelineAmount / entryCount */
  averagePipelineAmount: number;
  /** Sum of expectedDisbursement for this product */
  totalExpectedDisbursement: number;
  /** totalExpectedDisbursement / entryCount */
  averageExpectedDisbursement: number;
  entryCount: number;
  percentOfTotal: number;
}

export interface DelayedStageMetric {
  stageName: string;
  entryCount: number;
  totalPipeline: number;
  /** Sum of (amount + topUpAmount) for delayed entries in this stage */
  totalPipelineAmount: number;
  /** totalPipelineAmount / entryCount */
  averagePipelineAmount: number;
  /** Sum of expectedDisbursement for delayed entries in this stage */
  totalExpectedDisbursement: number;
  /** totalExpectedDisbursement / entryCount */
  averageExpectedDisbursement: number;
  /** Sum of excess time (days) over stage limit for all delayed entries in this stage */
  totalDelayDays: number;
}

export interface DelayStats {
  delayedEntryCount: number;
  totalDelayedPipeline: number;
  /** Total (amount + topUpAmount) for all delayed entries */
  totalPipelineAmount: number;
  /** totalPipelineAmount / delayedEntryCount */
  averagePipelineAmount: number;
  /** Total expectedDisbursement for all delayed entries */
  totalExpectedDisbursement: number;
  /** totalExpectedDisbursement / delayedEntryCount */
  averageExpectedDisbursement: number;
  /** Total excess time (days) all delayed entries have been over their stage limit, summed */
  totalDelayDays: number;
  delayedByStage: DelayedStageMetric[];
}

export interface ExpectedDisbursementGrandTotal {
  totalPipeline: number;
  /** Total pipeline amount = sum(amount + topUpAmount) */
  totalPipelineAmount: number;
  /** totalPipelineAmount / entryCount */
  averagePipelineAmount: number;
  /** Total expected disbursement (same as totalPipeline, explicit label) */
  totalExpectedDisbursement: number;
  /** totalExpectedDisbursement / entryCount */
  averageExpectedDisbursement: number;
  entryCount: number;
}

export interface PipelineMetricsResponse {
  summary: {
    grandTotal: ExpectedDisbursementGrandTotal;
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
