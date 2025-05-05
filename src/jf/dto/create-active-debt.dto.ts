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

  @IsBoolean()
  'Listed on CRB': boolean;

  @IsString()
  'Personal Loan or School Loan': string;

  @IsString()
  'Lender': string;

  @IsDate()
  'Date Loan Taken': Date;

  @IsDate()
  'Final Due Date': Date;

  @IsNumber()
  'Total Loan Amount': number;

  @IsNumber()
  'Balance': number;

  @IsNumber()
  @IsOptional()
  'Amount Overdue': number;

  @IsNumber()
  'Monthly Payment': number;

  @IsString()
  @IsOptional()
  'Debt Statement': string;

  @IsNumber()
  'Annual Declining Balance Interest Rate': number;

  @IsBoolean()
  'Is the loan collateralized?': boolean;

  @IsString()
  @IsOptional()
  'Type of collateral': string;

  @IsString()
  'What was the loan used for': string;
}
