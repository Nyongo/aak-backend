import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  creditApplicationId: string;

  @IsString()
  @IsNotEmpty()
  studentName: string;

  @IsString()
  @IsNotEmpty()
  admissionNumber: string;

  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  guardianName: string;

  @IsString()
  @IsNotEmpty()
  guardianPhone: string;

  @IsString()
  @IsOptional()
  guardianEmail?: string;

  @IsString()
  @IsNotEmpty()
  residentialAddress: string;

  @IsNumber()
  @IsNotEmpty()
  termlyFees: number;

  @IsNumber()
  @IsNotEmpty()
  annualFees: number;

  @IsDateString()
  @IsNotEmpty()
  enrollmentDate: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  documentUrl?: string;

  @IsString()
  @IsNotEmpty()
  status: string; // Active, Inactive, Graduated, etc.

  @IsString()
  @IsOptional()
  notes?: string;
}
