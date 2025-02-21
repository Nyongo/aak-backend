import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
  IsNumber,
} from 'class-validator';

export class CreateCropInFarmDto {
  @IsNumber()
  @IsNotEmpty()
  farmId: number;

  @IsNumber()
  @IsNotEmpty()
  cropId: number;

  @IsString()
  @IsNotEmpty()
  cropStatus: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  description: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
