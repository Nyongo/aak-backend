import { IsOptional, IsString, IsEnum } from 'class-validator';

export class QueryAcademyGuidesDto {
  @IsOptional()
  @IsString()
  lang?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'COMING_SOON', 'PUBLISHED'])
  status?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
