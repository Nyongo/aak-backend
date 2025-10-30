import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAddressDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  addressType: string; // e.g., "Home", "Work", "Other"

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  location: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    return parseFloat(value);
  })
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    return parseFloat(value);
  })
  @IsNumber()
  latitude?: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  status: string = 'Active';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return false;
  })
  @IsBoolean()
  isPrimary?: boolean = false;

  @IsNotEmpty()
  @IsString()
  parentId: string;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  addressType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    return parseFloat(value);
  })
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    return parseFloat(value);
  })
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  parentId?: string;
}


