import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsInt,
  Length,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  company: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  contactPerson: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  phone?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsInt()
  @IsOptional()
  categoryId?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
