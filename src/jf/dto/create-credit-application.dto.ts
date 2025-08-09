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

  @IsString()
  'Application Start Date': string;

  @IsString()
  'Credit Type': string;

  @IsString()
  'Total Amount Requested': string;

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
  'SSL ID': string;

  @IsString()
  @IsOptional()
  'SSL Feedback on Action': string;

  @IsBoolean()
  @IsOptional()
  'School CRB Available': boolean;

  @IsString()
  @IsOptional()
  'Referred By': string;

  @IsString()
  @IsOptional()
  'Current Cost of Capital': string;

  @IsString()
  @IsOptional()
  'Checks Collected': string;

  @IsString()
  @IsOptional()
  'Checks Needed for Loan': string;

  @IsString()
  @IsOptional()
  'Comments on Checks': string;

  @IsString()
  @IsOptional()
  'Status': string;
}
