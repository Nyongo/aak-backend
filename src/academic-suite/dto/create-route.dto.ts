import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum TripType {
  MORNING_PICKUP = 'MORNING_PICKUP',
  EVENING_DROPOFF = 'EVENING_DROPOFF',
  FIELD_TRIP = 'FIELD_TRIP',
  EXTRA_CURRICULUM = 'EXTRA_CURRICULUM',
  EMERGENCY = 'EMERGENCY',
}

export enum RiderType {
  DAILY = 'DAILY',
  OCCASIONAL = 'OCCASIONAL',
}

export class CreateRouteDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNotEmpty()
  @IsString()
  schoolId: string;

  @IsNotEmpty()
  @IsEnum(TripType)
  tripType: TripType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsString()
  busId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsEnum(TripType)
  tripType?: TripType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsString()
  busId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}

export class AddRouteStudentDto {
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @IsOptional()
  @IsEnum(RiderType)
  riderType?: RiderType;
}

export class RemoveRouteStudentDto {
  @IsNotEmpty()
  @IsString()
  studentId: string;
}

export class BulkAddRouteStudentsDto {
  @IsNotEmpty()
  @IsArray()
  students: BulkStudentDto[];
}

export class BulkStudentDto {
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @IsOptional()
  @IsEnum(RiderType)
  riderType?: RiderType;
}

export class BulkRemoveRouteStudentsDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  studentIds: string[];
}
