import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDailyWorkPlanDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  plannedVisit: string;

  @IsString()
  @IsOptional()
  actualGpsCoordinates?: string;

  @IsString()
  callsMadeDescription: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  supervisorReview?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsNotEmpty()
  sslStaffId: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  teamLeaderId?: string;

  @IsString()
  @IsOptional()
  schoolName?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  taskOfTheDay?: string;

  @IsString()
  @IsOptional()
  pinnedLocation?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  locationIsVerified?: boolean;

  @IsString()
  @IsOptional()
  marketingOfficerComments?: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  transportCost: number; // Required - must be provided (can be 0)

  @IsBoolean()
  @IsNotEmpty()
  @Type(() => Boolean)
  isVerified: boolean;

  @IsString()
  @IsOptional()
  verifiedBy?: string;

  @IsBoolean()
  @IsNotEmpty()
  @Type(() => Boolean)
  isPaid: boolean;
}
