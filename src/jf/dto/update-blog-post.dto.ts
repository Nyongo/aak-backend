import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BlogPostTranslationDto } from './create-blog-post.dto';

export class UpdateBlogPostDto {
  @IsOptional()
  @IsUrl()
  heroImage?: string | null;

  @IsOptional()
  @IsString()
  heroImagePublicId?: string | null;

  @IsOptional()
  @IsString()
  authorId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  authorRole?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogPostTranslationDto)
  translations?: BlogPostTranslationDto[];
}
