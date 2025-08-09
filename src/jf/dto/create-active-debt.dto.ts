import {
  IsString,
  IsNumber,
  IsDate,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateActiveDebtDto {
  @IsString()
  'Credit Application ID': string;

  @IsString()
  'Debt Status': string;

  @IsString()
  @IsOptional()
  'Listed on CRB': string;

  @IsString()
  'Personal Loan or School Loan': string;

  @IsString()
  @IsOptional()
  'Loan Type': string;

  @IsString()
  'Lender': string;

  @IsString()
  'Date Loan Taken': string;

  @IsString()
  'Final Due Date': string;

  @IsString()
  'Total Loan Amount': string;

  @IsString()
  'Balance': string;

  @IsString()
  @IsOptional()
  'Amount Overdue': string;

  @IsString()
  'Monthly Payment': string;

  @IsString()
  'Annual Declining Balance Interest Rate': string;

  @IsString()
  @IsOptional()
  'Is the loan collateralized?': string;

  @IsString()
  @IsOptional()
  'Type of collateral': string;

  @IsString()
  'What was the loan used for': string;
}
