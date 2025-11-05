import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDailyWorkPlanDto {
  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  plannedVisit?: string;

  @IsString()
  @IsOptional()
  actualGpsCoordinates?: string;

  @IsString()
  @IsOptional()
  callsMadeDescription?: string;

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
  @IsOptional()
  sslStaffId?: string;

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
  @IsOptional()
  @Type(() => Number)
  transportCost?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isVerified?: boolean;

  @IsString()
  @IsOptional()
  verifiedBy?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isPaid?: boolean;
}

