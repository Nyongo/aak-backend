import { IsArray, IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateStudentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  admissionNumber: string;

  @IsNotEmpty()
  @IsString()
  dateOfBirth: string; // ISO string (YYYY-MM-DD)

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  gender: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string = 'Active';

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        // Accept comma-separated or JSON array
        if (value.trim().startsWith('[')) return JSON.parse(value);
        return value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      } catch (_) {
        return [];
      }
    }
    return [];
  })
  @IsArray()
  specialNeeds?: string[] = [];

  @IsNotEmpty()
  @IsString()
  medicalInfo: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean = true;

  @IsNotEmpty()
  @IsString()
  schoolId: string;

  @IsNotEmpty()
  @IsString()
  parentId: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  admissionNumber?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        if (value.trim().startsWith('[')) return JSON.parse(value);
        return value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      } catch (_) {
        return undefined;
      }
    }
    return undefined;
  })
  @IsArray()
  specialNeeds?: string[];

  @IsOptional()
  @IsString()
  medicalInfo?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
