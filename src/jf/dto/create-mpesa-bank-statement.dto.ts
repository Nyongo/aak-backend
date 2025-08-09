import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Transform as ClassTransform } from 'class-transformer';

export class CreateMpesaBankStatementDto {
  @IsString()
  creditApplicationId: string;

  @IsString()
  personalOrBusinessAccount: string;

  @IsString()
  type: string;

  @IsString()
  accountDetails: string;

  @IsString()
  description: string;

  @IsString()
  statementStartDate: string;

  @IsString()
  statementEndDate: string;

  @ClassTransform(({ value }) => Number(value))
  @IsNumber()
  totalRevenue: number;

  @IsString()
  @IsOptional()
  statement?: string;

  @IsString()
  @IsOptional()
  convertedExcelFile?: string;
}
