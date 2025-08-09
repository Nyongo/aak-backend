import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  make?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  model?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  licensePlate?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  vin?: string;

  @IsNumber()
  @IsOptional()
  year?: number;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  color?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  fuelType?: string;

  @IsNumber()
  @IsOptional()
  mileage?: number;

  @IsNumber()
  @IsOptional()
  averageFuelConsumption?: number;

  @IsNumber()
  @IsOptional()
  pricePerKm?: number;

  @IsDateString()
  @IsOptional()
  registrationExpiry?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @Length(1, 200)
  notes?: string;
}
