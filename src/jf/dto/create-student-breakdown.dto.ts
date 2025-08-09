import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateStudentBreakdownDto {
  @IsString()
  creditApplicationId: string;

  @IsString()
  feeType: string;

  @IsString()
  term: string;

  @IsString()
  grade: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  numberOfStudents: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  fee: number;
}
