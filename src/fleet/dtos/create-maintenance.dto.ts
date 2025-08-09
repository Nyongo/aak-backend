import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class CreateMaintenanceDto {
  @IsNumber()
  @IsNotEmpty()
  vehicleId: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  maintenanceType: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  description: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @IsDateString()
  @IsOptional()
  completedDate?: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  serviceProvider?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  invoiceNumber?: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @IsString()
  @IsOptional()
  @Length(1, 200)
  notes?: string;

  @IsNumber()
  @IsOptional()
  mileageAtService?: number;
}
