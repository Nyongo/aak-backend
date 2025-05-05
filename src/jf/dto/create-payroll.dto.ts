import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePayrollDto {
  @IsString()
  'Credit Application ID': string;

  @IsString()
  'Role': string;

  @IsNumber()
  'Number of Employees in Role': number;

  @IsNumber()
  'Monthly Salary': number;

  @IsNumber()
  'Months per Year the Role is Paid': number;

  @IsString()
  @IsOptional()
  'Notes': string;
}
