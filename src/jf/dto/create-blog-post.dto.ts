import {
  Allow,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BlogLanguage } from '@prisma/client';

export class BlogSectionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEnum(['TEXT', 'AD', 'INTERNAL_AD'])
  type: 'TEXT' | 'AD' | 'INTERNAL_AD';

  @IsNotEmpty()
  order: number;

  // ── TEXT ────────────────────────────────────────────────────
  // Tiptap JSON doc — @Allow() bypasses deep validation
  @Allow()
  @IsOptional()
  content?: Record<string, any>;

  // ── AD (Google AdSense) ─────────────────────────────────────
  @IsOptional()
  @IsString()
  adSlotId?: string;

  // ── INTERNAL_AD ─────────────────────────────────────────────
  // Cloudinary image URL served directly as <img src>
  @IsOptional()
  @IsString()
  internalAdImage?: string;

  // Cloudinary public_id kept so image can be deleted
  // when the post or section is removed
  @IsOptional()
  @IsString()
  internalAdImagePublicId?: string;

  // Destination URL — internal page or external link
  @IsOptional()
  @IsString()
  internalAdLink?: string;
}

export class BlogPostTranslationDto {
  @IsEnum(BlogLanguage)
  language: BlogLanguage;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  excerpt: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogSectionDto)
  sections: BlogSectionDto[];
}

export class CreateBlogPostDto {
  @IsOptional()
  @IsUrl()
  heroImage?: string;

  @IsOptional()
  @IsString()
  heroImagePublicId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  authorName: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  authorRole?: string;

  @IsOptional()
  @Transform(({ value }) => value ?? undefined)
  @IsString()
  categoryId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogPostTranslationDto)
  translations: BlogPostTranslationDto[];
}
