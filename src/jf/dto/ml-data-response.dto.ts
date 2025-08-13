export class MlDataSummaryDto {
  totalApplications: number;
  totalBorrowers: number;
  totalDirectors: number;
  totalFinancialSurveys: number;
  totalHomeVisits: number;
  totalAssetTitles: number;
  totalContractDetails: number;
  totalComments: number;
  lastUpdated: Date;
}

export class DataCompletenessDto {
  applicationCompleteness: {
    totalApplications: number;
    withBorrower: number;
    withDirectors: number;
    withFinancialSurvey: number;
    withHomeVisit: number;
    withAssetTitles: number;
    withContractDetails: number;
    withComments: number;
  };
  completenessPercentages: {
    borrowerMatch: number;
    hasFinancialSurvey: number;
    hasHomeVisit: number;
    hasAssetTitles: number;
    hasContractDetails: number;
    hasComments: number;
  };
}

export class ApplicationFiltersDto {
  status?: string;
  creditType?: string;
  hasFinancialSurvey?: string;
  hasHomeVisit?: string;
  minAmount?: string;
  maxAmount?: string;
}

export class PaginatedMlDataResponseDto {
  data: any[]; // MergedApplicationData from service
  total: number;
  limit?: number;
  offset?: number;
}

export class FilteredMlDataResponseDto {
  data: any[]; // MergedApplicationData from service
  total: number;
  filters: ApplicationFiltersDto;
}

export class CreditApplicationMlDto {
  sheetId: string | null;
  creditType: string | null;
  totalAmountRequested: number | null;
  finalAmountApprovedAndDisbursed: number | null;
  status: string | null;
}
