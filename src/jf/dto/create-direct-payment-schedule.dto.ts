import { IsOptional, IsString } from 'class-validator';

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
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  amountDue?: string;

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
  @IsString()
  amountPaid?: string;

  @IsOptional()
  @IsString()
  balanceCarriedForward?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
