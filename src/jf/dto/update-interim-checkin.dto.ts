import { IsObject, IsOptional, IsString } from 'class-validator';

/** Autosave between wizard steps; typically only `responses` is sent. */
export class UpdateInterimCheckInDto {
  @IsOptional()
  @IsObject()
  responses?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  surveyVersion?: string;

  @IsOptional()
  @IsString()
  submittedBySslUserId?: string;
}
