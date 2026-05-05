import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateImpactSurveySubmissionDto {
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

  @IsObject()
  responses: Record<string, any>;

  // Optional shortcuts if frontend wants to pass precomputed values
  @IsOptional()
  @IsString()
  schoolType?: string;

  @IsOptional()
  @IsString()
  areaType?: string;
}

