import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class CreateRestructuringDto {
  @IsOptional()
  @IsString()
  sheetId?: string;

  @IsOptional()
  @IsString()
  loanId?: string;

  @IsOptional()
  date?: Date | string;

  @IsOptional()
  @IsString()
  restructuringDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  previousLoanTerms?: string;

  @IsOptional()
  @IsString()
  newLoanTerms?: string;

  @IsOptional()
  @IsNumber()
  previousPrincipalAmount?: number;

  @IsOptional()
  @IsNumber()
  newPrincipalAmount?: number;

  @IsOptional()
  @IsString()
  previousInterestRate?: string;

  @IsOptional()
  @IsString()
  newInterestRate?: string;

  @IsOptional()
  @IsNumber()
  previousNumberOfMonths?: number;

  @IsOptional()
  @IsNumber()
  newNumberOfMonths?: number;

  @IsOptional()
  @IsNumber()
  previousMonthlyPayment?: number;

  @IsOptional()
  @IsNumber()
  newMonthlyPayment?: number;

  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsString()
  approvalDate?: string;

  @IsOptional()
  @IsString()
  createdAtSheet?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  sslId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  synced?: boolean;
}
