import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class CreateWriteOffDto {
  @IsOptional()
  @IsString()
  sheetId?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  loanId?: string;

  @IsOptional()
  @IsString()
  paymentScheduleId?: string;

  @IsOptional()
  @IsNumber()
  principalAmountWrittenOff?: number;

  @IsOptional()
  @IsNumber()
  interestAmountWrittenOff?: number;

  @IsOptional()
  @IsNumber()
  vehicleInsuranceAmountWrittenOff?: number;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

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
  loanOrPaymentLevel?: string;

  @IsOptional()
  @IsNumber()
  penaltyAmountWrittenOff?: number;

  @IsOptional()
  @IsBoolean()
  synced?: boolean;
}
