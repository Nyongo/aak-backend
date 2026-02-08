/**
 * Canonical pipeline dropdown options (must match client UI and seed data).
 */

/** Default stage for new pipeline entries */
export const DEFAULT_LOAN_STAGE = 'Client Negotiation';

/** Loan stage options – order matches client dropdown */
export const LOAN_STAGE_OPTIONS = [
  'Client Negotiation',
  'Documentation',
  'SSL Application',
  'TL review',
  'Credit Analyst Review',
  'Investment Committee Review',
  'Contracting at Legal',
  'Offer Acceptance',
  'DRU credit check',
  'Securitization & Credit Admin',
  'Disbursement',
] as const;

/** Applicable regions */
export const REGION_OPTIONS = [
  'Nairobi East',
  'Nairobi West',
  'Mt. Kenya East',
  'Mt. Kenya West',
  'North Rift',
  'South Rift',
  'Northeastern',
  'Western',
  'Uganda',
] as const;

/** Loan product options – order matches client dropdown */
export const PRODUCT_OPTIONS = [
  'Flexy',
  'Working Capital',
  'fully secured',
  'fully secured land',
  'SME',
] as const;

/** Source of client options – order matches client dropdown */
export const SOURCE_OF_CLIENT_OPTIONS = [
  'Lead from Marketing',
  'Activation Lead',
  'Top Up Listing',
  'Staff Referral',
  'Client Referral',
  'Walk in Client',
  'Direct Sales',
  'Data Mining',
] as const;

export type LoanStage = (typeof LOAN_STAGE_OPTIONS)[number];
export type Region = (typeof REGION_OPTIONS)[number];
export type Product = (typeof PRODUCT_OPTIONS)[number];
export type SourceOfClient = (typeof SOURCE_OF_CLIENT_OPTIONS)[number];
