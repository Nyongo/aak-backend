import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsBoolean,
} from 'class-validator';

export class CreateCreditApplicationDto {
  @IsString()
  'Borrower ID': string;

  @IsDate()
  'Application Start Date': Date;

  @IsString()
  'Credit Type': string;

  @IsNumber()
  'Total Amount Requested': number;

  @IsString()
  @IsOptional()
  'Working Capital Application Number': string;

  @IsBoolean()
  @IsOptional()
  'SSL Action Needed': boolean;

  @IsString()
  @IsOptional()
  'SSL Action': string;

  @IsString()
  @IsOptional()
  'SSL Feedback on Action': string;

  @IsBoolean()
  @IsOptional()
  'School CRB Available': boolean;

  @IsString()
  @IsOptional()
  'Referred By': string;

  @IsNumber()
  @IsOptional()
  'Current Cost of Capital': number;

  @IsNumber()
  @IsOptional()
  'Checks Collected': number;

  @IsNumber()
  @IsOptional()
  'Checks Needed for Loan': number;

  @IsString()
  @IsOptional()
  'Comments on Checks': string;
}
