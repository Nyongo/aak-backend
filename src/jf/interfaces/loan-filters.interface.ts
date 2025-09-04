export interface LoanFilters {
  borrowerId?: string;
  sslId?: string;
  status?: string;
  riskCategory?: string;
  region?: string;
  loanType?: string;
  par?: number;
  overdue?: boolean;
  fullyPaid?: boolean;
  restructured?: boolean;
  referral?: boolean;
  catalyzeEligible?: boolean;
  highRisk?: boolean;
}
