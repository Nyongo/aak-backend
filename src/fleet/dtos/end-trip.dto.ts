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

enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export class EndTripDto {
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  endGps?: string; // "latitude,longitude"

  @IsPhoneNumber()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  customerName?: string;

  @IsNumber()
  @IsOptional()
  distance?: number; // in kilometers

  @IsNumber()
  @IsOptional()
  totalPrice?: number;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

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

  @IsNumber()
  @IsOptional()
  rating?: number; // 1-5 star rating

  @IsString()
  @IsOptional()
  @Length(1, 500)
  feedback?: string;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  notes?: string;
}
