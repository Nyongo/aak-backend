import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePipelineEntryDto {
  @IsString()
  @IsNotEmpty()
  clientType: string; // New | Existing

  @IsString()
  @IsNotEmpty()
  entityName: string;

  @IsString()
  @IsOptional()
  clientTel?: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsString()
  @IsNotEmpty()
  product: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  topUpAmount?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isTopUp?: boolean;

  @IsString()
  @IsOptional()
  crossSellOpportunities?: string;

  @IsString()
  @IsOptional()
  sslStaffId?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  loanStage?: string;

  @IsDateString()
  @IsOptional()
  estimatedClosing?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  probabilityOfClosing?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  comments?: string;
}
