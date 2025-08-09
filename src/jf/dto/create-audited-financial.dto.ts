import { IsString, IsOptional } from 'class-validator';

export class CreateAuditedFinancialDto {
  @IsString()
  creditApplicationId: string;

  @IsOptional()
  @IsString()
  statementType?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  file?: string;
}
