import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateInterimCheckInDto {
  @IsString()
  @IsNotEmpty()
  borrowerId: string;

  @IsString()
  @IsNotEmpty()
  creditApplicationId: string;

  @IsString()
  @IsNotEmpty()
  submittedBySslUserId: string;

  @IsString()
  @IsNotEmpty()
  surveyVersion: string;

  @IsIn(['annual', 'termly'])
  checkInKind: 'annual' | 'termly';

  @IsOptional()
  @Type(() => Number)
  termNumber?: number | null;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @IsObject()
  responses: Record<string, unknown>;
}
