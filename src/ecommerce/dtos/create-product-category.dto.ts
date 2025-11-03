import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Length,
} from 'class-validator';

export enum CategoryStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export class CreateProductCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @IsEnum(CategoryStatus)
  @IsNotEmpty()
  status: CategoryStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
