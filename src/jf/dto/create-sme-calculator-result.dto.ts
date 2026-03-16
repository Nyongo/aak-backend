import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SmeCalculatorResultsDto {
  @IsNumber()
  @IsOptional()
  effectiveRevenues?: number;

  @IsNumber()
  @IsOptional()
  grossProfit?: number;

  @IsNumber()
  @IsOptional()
  operatingExpenses?: number;

  @IsNumber()
  @IsOptional()
  netBusinessIncome?: number;

  @IsNumber()
  @IsOptional()
  householdDeduction?: number;

  @IsNumber()
  @IsOptional()
  netDisposableIncome?: number;

  @IsNumber()
  @IsOptional()
  monthlyInstallment?: number;

  @IsNumber()
  @IsOptional()
  debtServiceRatio?: number;

  @IsNumber()
  @IsOptional()
  maxMonthlyPayment?: number;

  @IsNumber()
  @IsOptional()
  maxLoanAffordability?: number;
}

export class CreateSmeCalculatorResultDto {
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsNumber()
  sales: number;

  @IsNumber()
  verifiedSales: number;

  @IsNumber()
  costOfSales: number;

  @IsNumber()
  rent: number;

  @IsNumber()
  utilities: number;

  @IsNumber()
  labour: number;

  @IsNumber()
  transport: number;

  @IsNumber()
  tradingLicense: number;

  @IsNumber()
  otherExpenses: number;

  @IsNumber()
  otherIncome: number;

  @IsNumber()
  householdExpenses: number;

  @IsNumber()
  otherDebtPayments: number;

  @IsString()
  selectedProduct: string;

  @IsNumber()
  proposedLoan: number;

  @IsInt()
  tenor: number;

  @IsBoolean()
  applyStress: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmeCalculatorResultsDto)
  results?: SmeCalculatorResultsDto;
}

