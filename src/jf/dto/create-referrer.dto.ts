import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateReferrerDto {
  @IsString()
  @IsNotEmpty()
  'School ID': string;

  @IsString()
  @IsNotEmpty()
  'Referrer Name': string;

  @IsString()
  @IsOptional()
  'M Pesa Number'?: string;

  @IsString()
  @IsOptional()
  'Referral Reward Paid?'?: string;

  @IsString()
  @IsOptional()
  'Date Paid'?: string;

  @IsString()
  @IsOptional()
  'Amount Paid'?: string;
}
