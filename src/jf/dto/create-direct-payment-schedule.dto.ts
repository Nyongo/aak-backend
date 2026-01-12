import { IsOptional, IsString, IsNumber, IsDateString, IsInt } from 'class-validator';

export class CreateDirectPaymentScheduleDto {
  @IsOptional()
  @IsString()
  sheetId?: string;

  @IsOptional()
  @IsString()
  borrowerId?: string;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  loanId?: string;

  @IsOptional()
  @IsString()
  creditApplicationId?: string;

  @IsOptional()
  @IsString()
  paymentScheduleNumber?: string;

  @IsOptional()
  @IsString()
  installmentNumber?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: Date | string;

  @IsOptional()
  @IsNumber()
  amountDue?: number;

  @IsOptional()
  @IsString()
  principalAmount?: string;

  @IsOptional()
  @IsString()
  interestAmount?: string;

  @IsOptional()
  @IsString()
  feesAmount?: string;

  @IsOptional()
  @IsString()
  penaltyAmount?: string;

  @IsOptional()
  @IsString()
  totalAmount?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsString()
  balanceCarriedForward?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  // Core fields from the sheet
  @IsOptional()
  @IsString()
  directLoanId?: string;

  @IsOptional()
  @IsString()
  borrowerType?: string;

  @IsOptional()
  @IsString()
  holidayForgiveness?: string;

  @IsOptional()
  @IsString()
  amountStillUnpaid?: string;

  @IsOptional()
  @IsInt()
  daysLate?: number;

  @IsOptional()
  @IsString()
  dateFullyPaid?: string;

  @IsOptional()
  @IsString()
  paymentOverdue?: string;

  @IsOptional()
  @IsString()
  par14?: string;

  @IsOptional()
  @IsString()
  par30?: string;

  @IsOptional()
  @IsString()
  checkCashingStatus?: string;

  @IsOptional()
  @IsString()
  debtType?: string;

  @IsOptional()
  @IsString()
  notesOnPayment?: string;

  @IsOptional()
  @IsString()
  adjustedMonth?: string;

  @IsOptional()
  @IsString()
  creditLifeInsuranceFeesCharged?: string;

  @IsOptional()
  @IsString()
  interestChargedWithoutForgiveness?: string;

  @IsOptional()
  @IsString()
  principalRepaymentWithoutForgiveness?: string;

  @IsOptional()
  @IsString()
  vehicleInsurancePaymentDueWithoutForgiveness?: string;

  @IsOptional()
  @IsString()
  vehicleInsurancePaymentDue?: string;

  @IsOptional()
  @IsString()
  interestRepaymentDue?: string;

  @IsOptional()
  @IsString()
  principalRepaymentDue?: string;

  @IsOptional()
  @IsString()
  vehicleInsurancePremiumDueWithoutForgiveness?: string;

  @IsOptional()
  @IsString()
  vehicleInsuranceSurchargeDueWithoutForgiveness?: string;

  @IsOptional()
  @IsString()
  vehicleInsurancePremiumDueWithForgiveness?: string;

  @IsOptional()
  @IsString()
  vehicleInsuranceSurchargeDueWithForgiveness?: string;

  @IsOptional()
  @IsString()
  creditLifeInsuranceFeesOwedToInsurer?: string;

  @IsOptional()
  @IsString()
  creditLifeInsuranceFeePaymentsUtilized?: string;

  @IsOptional()
  @IsString()
  creditLifeInsuranceFeeInsuranceExpense?: string;

  @IsOptional()
  @IsString()
  vehicleInsuranceFeesOwedToInsurer?: string;

  @IsOptional()
  synced?: boolean;
}
