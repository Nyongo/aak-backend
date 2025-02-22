import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
  IsNumber,
} from 'class-validator';

export class CreateFarmDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  plotSize: string;

  @IsNumber()
  @IsNotEmpty()
  countyId: number;

  @IsNumber()
  @IsNotEmpty()
  farmerId: number;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsOptional()
  altitude: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  latitude: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  longitude: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  imageUrl: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
