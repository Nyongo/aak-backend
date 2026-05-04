import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { BlogLanguage } from '@prisma/client';

export class QueryBlogPostsDto {
  @IsOptional()
  @IsEnum(BlogLanguage)
  lang?: BlogLanguage;

  // Filter by category slug
  @IsOptional()
  @IsString()
  category?: string;

  // Full-text search across title and excerpt
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by author slug — used by the public author page */
  @IsOptional()
  @IsString()
  authorSlug?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
