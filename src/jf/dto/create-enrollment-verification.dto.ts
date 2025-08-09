import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEnrollmentVerificationDto {
  @IsString()
  creditApplicationId: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  numberOfStudentsThisYear: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  numberOfStudentsLastYear: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  numberOfStudentsTwoYearsAgo: number;

  @IsString()
  @IsOptional()
  subCountyEnrollmentReport?: string;

  @IsString()
  @IsOptional()
  enrollmentReport?: string;
}
