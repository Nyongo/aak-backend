import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

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

  @IsObject()
  responses: Record<string, unknown>;
}
