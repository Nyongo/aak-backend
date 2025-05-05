import { IsString, IsOptional } from 'class-validator';

export class CreateFeePlanDto {
  @IsString()
  'Credit Application ID': string;

  @IsString()
  'School Year': string;

  @IsString()
  @IsOptional()
  'Photo': string;

  @IsString()
  @IsOptional()
  'File': string;
}
