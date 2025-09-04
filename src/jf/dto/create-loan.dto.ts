import { IsOptional, IsString } from 'class-validator';

export class CreateLoanDto {
  @IsOptional()
  @IsString()
  sheetId?: string;

  // Core loan fields
  @IsOptional()
  @IsString()
  loanType?: string;

  @IsOptional()
  @IsString()
  loanPurpose?: string;

  @IsOptional()
  @IsString()
  borrowerType?: string;

  @IsOptional()
  @IsString()
  borrowerId?: string;

  @IsOptional()
  @IsString()
  borrowerName?: string;

  @IsOptional()
  @IsString()
  principalAmount?: string;

  @IsOptional()
  @IsString()
  interestType?: string;

  @IsOptional()
  @IsString()
  annualDecliningInterest?: string;

  @IsOptional()
  @IsString()
  annualFlatInterest?: string;

  @IsOptional()
  @IsString()
  processingFeePercentage?: string;

  @IsOptional()
  @IsString()
  creditLifeInsurancePercentage?: string;

  @IsOptional()
  @IsString()
  securitizationFee?: string;

  @IsOptional()
  @IsString()
  processingFee?: string;

  @IsOptional()
  @IsString()
  creditLifeInsuranceFee?: string;

  @IsOptional()
  @IsString()
  numberOfMonths?: string;

  @IsOptional()
  @IsString()
  dailyPenalty?: string;

  @IsOptional()
  @IsString()
  amountToDisburse?: string;

  @IsOptional()
  @IsString()
  totalComprehensiveVehicleInsurancePaymentsToPay?: string;

  @IsOptional()
  @IsString()
  totalInterestCharged?: string;

  @IsOptional()
  @IsString()
  totalInterestToPay?: string;

  @IsOptional()
  @IsString()
  totalPrincipalToPay?: string;

  @IsOptional()
  @IsString()
  creditApplicationId?: string;

  @IsOptional()
  @IsString()
  firstPaymentPeriod?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance?: string;

  @IsOptional()
  @IsString()
  totalLoanAmountPaidIncludingPenaltiesAndInsurance?: string;

  @IsOptional()
  @IsString()
  totalPenaltiesAssessed?: string;

  @IsOptional()
  @IsString()
  totalPenaltiesPaid?: string;

  @IsOptional()
  @IsString()
  penaltiesStillDue?: string;

  @IsOptional()
  @IsString()
  sslId?: string;

  @IsOptional()
  @IsString()
  loanOverdue?: string;

  @IsOptional()
  @IsString()
  par14?: string;

  @IsOptional()
  @IsString()
  par30?: string;

  @IsOptional()
  @IsString()
  par60?: string;

  @IsOptional()
  @IsString()
  par90?: string;

  @IsOptional()
  @IsString()
  par120?: string;

  @IsOptional()
  @IsString()
  amountOverdue?: string;

  @IsOptional()
  @IsString()
  loanFullyPaid?: string;

  @IsOptional()
  @IsString()
  loanStatus?: string;

  @IsOptional()
  @IsString()
  totalAmountDueToDate?: string;

  @IsOptional()
  @IsString()
  amountDisbursedToDateIncludingFees?: string;

  @IsOptional()
  @IsString()
  balanceOfDisbursementsOwed?: string;

  @IsOptional()
  @IsString()
  principalPaidToDate?: string;

  @IsOptional()
  @IsString()
  outstandingPrincipalBalance?: string;

  @IsOptional()
  @IsString()
  numberOfAssetsUsedAsCollateral?: string;

  @IsOptional()
  @IsString()
  numberOfAssetsRecorded?: string;

  @IsOptional()
  @IsString()
  allCollateralRecorded?: string;

  @IsOptional()
  @IsString()
  principalDifference?: string;

  @IsOptional()
  @IsString()
  creditLifeInsuranceSubmitted?: string;

  @IsOptional()
  @IsString()
  directorHasCompletedCreditLifeHealthExamination?: string;

  @IsOptional()
  @IsString()
  recordOfReceiptForCreditLifeInsurance?: string;

  @IsOptional()
  @IsString()
  percentDisbursed?: string;

  @IsOptional()
  @IsString()
  daysLate?: string;

  @IsOptional()
  @IsString()
  totalUnpaidLiability?: string;

  @IsOptional()
  @IsString()
  restructured?: string;

  @IsOptional()
  @IsString()
  collateralCheckedByLegalTeam?: string;

  @IsOptional()
  @IsString()
  hasFemaleDirector?: string;

  @IsOptional()
  @IsString()
  reportsGenerated?: string;

  @IsOptional()
  @IsString()
  contractUploaded?: string;

  @IsOptional()
  @IsString()
  percentChargeOnVehicleInsuranceFinancing?: string;

  @IsOptional()
  @IsString()
  customerCareCallDone?: string;

  @IsOptional()
  @IsString()
  checksHeld?: string;

  @IsOptional()
  @IsString()
  remainingPeriodsForChecks?: string;

  @IsOptional()
  @IsString()
  adequateChecksForRemainingPeriods?: string;

  @IsOptional()
  @IsString()
  totalLiabilityAmountFromContract?: string;

  @IsOptional()
  @IsString()
  liabilityCheck?: string;

  @IsOptional()
  @IsString()
  creditLifeInsurer?: string;

  @IsOptional()
  @IsString()
  interestChargedVsDueDifference?: string;

  @IsOptional()
  @IsString()
  principalDueWithForgivenessVsWithoutForgiveness?: string;

  @IsOptional()
  @IsString()
  insuranceDueWithVsWithoutForgiveness?: string;

  @IsOptional()
  @IsString()
  firstLoan?: string;

  @IsOptional()
  @IsString()
  additionalFeesWithheldFromDisbursement?: string;

  @IsOptional()
  @IsString()
  daysSinceCreation?: string;

  @IsOptional()
  @IsString()
  referral?: string;

  @IsOptional()
  @IsString()
  numberOfInstallmentsOverdue?: string;

  @IsOptional()
  @IsString()
  amountPaidTowardsOverdueInstallments?: string;

  @IsOptional()
  @IsString()
  borrowerIdForContracts?: string;

  @IsOptional()
  @IsString()
  mostRecentInstallmentPartiallyPaid?: string;

  @IsOptional()
  @IsString()
  willingnessToPay?: string;

  @IsOptional()
  @IsString()
  capabilityToPay?: string;

  @IsOptional()
  @IsString()
  loanRiskCategory?: string;

  @IsOptional()
  @IsString()
  calculatedAmountToDisburse?: string;

  @IsOptional()
  @IsString()
  differenceBetweenCalculatedAndRecordedDisbursement?: string;

  @IsOptional()
  @IsString()
  teachers?: string;

  @IsOptional()
  @IsString()
  totalInterestPaid?: string;

  @IsOptional()
  @IsString()
  outstandingInterestBalance?: string;

  @IsOptional()
  @IsString()
  totalVehicleInsuranceDue?: string;

  @IsOptional()
  @IsString()
  totalVehicleInsurancePaid?: string;

  @IsOptional()
  @IsString()
  outstandingVehicleInsuranceBalance?: string;

  @IsOptional()
  @IsString()
  reassigned?: string;

  @IsOptional()
  @IsString()
  flexiLoan?: string;

  @IsOptional()
  @IsString()
  loanQualifiesForCatalyzeProgram?: string;

  @IsOptional()
  @IsString()
  allStaff?: string;

  @IsOptional()
  @IsString()
  loanHasGonePAR30?: string;

  @IsOptional()
  @IsString()
  hasMaleDirector?: string;

  @IsOptional()
  @IsString()
  schoolArea?: string;

  @IsOptional()
  @IsString()
  firstDisbursement?: string;

  @IsOptional()
  @IsString()
  totalAdditionalFeesNotWithheldFromDisbursement?: string;

  @IsOptional()
  @IsString()
  additionalFeesNotWithheldFromDisbursementPaid?: string;

  @IsOptional()
  @IsString()
  additionalFeesNotWithheldFromDisbursementStillDue?: string;

  @IsOptional()
  @IsString()
  averageSchoolFees?: string;

  @IsOptional()
  @IsString()
  contractingDate?: string;

  @IsOptional()
  @IsString()
  submittedToCatalyze?: string;

  @IsOptional()
  @IsString()
  mostRecentContract?: string;

  @IsOptional()
  @IsString()
  mostRecentContractType?: string;

  @IsOptional()
  @IsString()
  schoolType?: string;

  @IsOptional()
  @IsString()
  howManyClassroomsWillBeConstructedWithTheLoan?: string;

  @IsOptional()
  @IsString()
  howManyVehiclesWillBePurchasedWithTheLoan?: string;

  @IsOptional()
  @IsString()
  principalWrittenOff?: string;

  @IsOptional()
  @IsString()
  interestWrittenOff?: string;

  @IsOptional()
  @IsString()
  vehicleInsuranceWrittenOff?: string;

  @IsOptional()
  @IsString()
  segmentedRepaymentView?: string;

  @IsOptional()
  @IsString()
  beforeJan12024?: string;

  @IsOptional()
  @IsString()
  loanNumber?: string;

  @IsOptional()
  @IsString()
  teamLeader?: string;

  @IsOptional()
  @IsString()
  vehicleInsuranceWithoutForgivenessCheck?: string;

  @IsOptional()
  @IsString()
  vehicleInsuranceWithForgivenessCheck?: string;

  @IsOptional()
  @IsString()
  suspendedInterestCharged?: string;

  @IsOptional()
  @IsString()
  suspendedInterestDue?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  exciseDuty?: string;

  @IsOptional()
  synced?: boolean;
}
