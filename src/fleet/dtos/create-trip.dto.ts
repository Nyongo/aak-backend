import {
  IsString,
  IsOptional,
  IsNotEmpty,
  Length,
  IsNumber,
  IsDateString,
  IsEnum,
  IsPhoneNumber,
} from 'class-validator';

enum TripStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD',
}

export class CreateTripDto {
  @IsNumber()
  @IsNotEmpty()
  vehicleId: number;

  @IsNumber()
  @IsNotEmpty()
  driverId: number;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  customerName?: string;

  @IsPhoneNumber()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  startGps: string; // "latitude,longitude"

  @IsString()
  @IsOptional()
  @Length(1, 50)
  endGps?: string; // "latitude,longitude"

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsNumber()
  @IsOptional()
  distance?: number; // in kilometers

  @IsNumber()
  @IsNotEmpty()
  pricePerKm: number;

  @IsNumber()
  @IsOptional()
  totalPrice?: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  purpose: string;

  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  paymentMethod?: string;

  @IsNumber()
  @IsOptional()
  fuelConsumption?: number; // liters consumed

  @IsNumber()
  @IsOptional()
  fuelCost?: number;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  notes?: string;
}
