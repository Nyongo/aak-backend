import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
} from 'class-validator';

export class CreateCropDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;

  @IsString()
  @IsOptional()
  @Length(3, 100)
  scientificName: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  description: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
