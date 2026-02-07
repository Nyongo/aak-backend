import { LOAN_STAGE_OPTIONS } from './pipeline-options';

/**
 * Per-stage config: completion %, max days in stage before delayed, and delay flag message.
 * Order must match LOAN_STAGE_OPTIONS.
 */
export const PIPELINE_STAGE_CONFIG: Record<
  string,
  { completionPercent: number; maxDaysInStage: number; delayFlag: string }
> = {
  'Client Negotiation': {
    completionPercent: 0,
    maxDaysInStage: 5,
    delayFlag: 'Delayed in Client Negotiation',
  },
  Documentation: {
    completionPercent: 10,
    maxDaysInStage: 4,
    delayFlag: 'Delayed in Documentation',
  },
  'SSL Application': {
    completionPercent: 20,
    maxDaysInStage: 1,
    delayFlag: 'Delayed in SSL Application',
  },
  'TL review': {
    completionPercent: 30,
    maxDaysInStage: 1,
    delayFlag: 'Delayed in TL review',
  },
  'Credit Analyst Review': {
    completionPercent: 40,
    maxDaysInStage: 0.5,
    delayFlag: 'Delayed in Credit Analyst Review',
  },
  'Investment Committee Review': {
    completionPercent: 50,
    maxDaysInStage: 1,
    delayFlag: 'Delayed in Investment Committee Review',
  },
  'Contracting at Legal': {
    completionPercent: 60,
    maxDaysInStage: 1,
    delayFlag: 'Delayed in Contracting at Legal',
  },
  'Offer Acceptance': {
    completionPercent: 70,
    maxDaysInStage: 0.5,
    delayFlag: 'Delayed in Offer Acceptance',
  },
  'DRU credit check': {
    completionPercent: 80,
    maxDaysInStage: 0.5,
    delayFlag: 'Delayed in DRU credit check',
  },
  'Securitization & Credit Admin': {
    completionPercent: 90,
    maxDaysInStage: 3,
    delayFlag: 'Delayed in Securitization & Credit Admin',
  },
  Disbursement: {
    completionPercent: 100,
    maxDaysInStage: 1,
    delayFlag: 'Delayed in Disbursement',
  },
};

/**
 * expectedDisbursement = (stage completion % / 100) * (amount + topUpAmount)
 */
export function computeExpectedDisbursement(
  loanStage: string | null,
  amount: number,
  topUpAmount: number,
): number {
  const config = loanStage ? PIPELINE_STAGE_CONFIG[loanStage] : null;
  const pct = config ? config.completionPercent : 0;
  const base = Number(amount) + Number(topUpAmount);
  return Math.round((pct / 100) * base * 100) / 100;
}

export interface StageProgress {
  stageCompletionPercent: number;
  daysInCurrentStage: number;
  maxDaysInStage: number;
  isDelayed: boolean;
  delayFlag: string | null;
}

/**
 * Compute progress and delay for a pipeline entry based on current stage and when they entered it.
 */
export function getStageProgress(
  loanStage: string | null,
  loanStageEnteredAt: Date | null,
  asOf: Date = new Date(),
): StageProgress {
  const defaultProgress: StageProgress = {
    stageCompletionPercent: 0,
    daysInCurrentStage: 0,
    maxDaysInStage: 0,
    isDelayed: false,
    delayFlag: null,
  };

  if (!loanStage) return defaultProgress;

  const config = PIPELINE_STAGE_CONFIG[loanStage];
  if (!config) return { ...defaultProgress, stageCompletionPercent: 0 };

  const enteredAt = loanStageEnteredAt ?? asOf;
  const daysInCurrentStage =
    (asOf.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24);
  const isDelayed = daysInCurrentStage > config.maxDaysInStage;

  // Preserve decimals (e.g. 0.000694 for ~1 min); round to 6 dp to avoid float noise
  const daysRounded = Math.round(daysInCurrentStage * 1e6) / 1e6;

  return {
    stageCompletionPercent: config.completionPercent,
    daysInCurrentStage: daysRounded,
    maxDaysInStage: config.maxDaysInStage,
    isDelayed,
    delayFlag: isDelayed ? config.delayFlag : null,
  };
}
