import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCustomerDto {
  @IsString()
  @IsOptional()
  companyLogo?: string;

  @IsString()
  companyName: string;

  @IsString()
  contactPerson: string;

  @IsString()
  phoneNumber: string;

  @IsEmail()
  emailAddress: string;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : 0))
  @IsNumber()
  @Min(0)
  @Max(10000)
  numberOfSchools?: number = 0;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean = true;
}

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  companyLogo?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  @Max(10000)
  numberOfSchools?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
