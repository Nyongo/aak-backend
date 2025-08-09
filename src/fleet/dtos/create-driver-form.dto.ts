import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
  IsDateString,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';

enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export class CreateDriverFormDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  firstName: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 15)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  nationalId: string;

  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  licenseNumber: string;

  @IsDateString()
  @IsNotEmpty()
  licenseExpiry: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  @Length(1, 200)
  address?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  emergencyContact?: string;

  @IsString()
  @IsOptional()
  @Length(1, 15)
  emergencyPhone?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @Length(1, 200)
  notes?: string;
}
