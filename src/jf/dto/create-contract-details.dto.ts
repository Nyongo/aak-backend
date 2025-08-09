import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateContractDetailsDto {
  @IsString()
  'Credit Application ID': string;

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  'Loan Length Requested (Months)': number;

  @IsOptional()
  @Transform(({ value }) => value?.toString())
  'Months the School Requests Forgiveness': number;

  @IsString()
  @IsOptional()
  'Disbursal Date Requested'?: string;

  @IsString()
  @IsOptional()
  '10% Down on Vehicle or Land Financing?'?: 'TRUE' | 'FALSE';

  @IsString()
  @IsOptional()
  'Created By'?: string;
}
