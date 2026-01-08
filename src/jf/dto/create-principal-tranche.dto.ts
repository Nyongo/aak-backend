import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreatePrincipalTrancheDto {
  @IsOptional()
  @IsString()
  sheetId?: string;

  @IsOptional()
  @IsString()
  directLoanId?: string;

  @IsOptional()
  @IsString()
  contractSigningDate?: string;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  sslId?: string;

  @IsOptional()
  @IsString()
  initialDisbursementDateInContract?: string;

  @IsOptional()
  @IsString()
  dateTrancheHasGonePar30?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  hasFemaleDirector?: string;

  @IsOptional()
  @IsString()
  loanType?: string;

  @IsOptional()
  @IsString()
  reassigned?: string;

  @IsOptional()
  @IsString()
  teamLeader?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsBoolean()
  synced?: boolean;
}
