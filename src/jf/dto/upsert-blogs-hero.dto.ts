// ─────────────────────────────────────────────────────────────
// BLOGS HERO MODULE
// Manages the singleton hero section for the /blog listing page.
//
// GET /blogs-hero?lang=EN|KIS   - public
// PUT /blogs-hero               - protected, upserts the singleton
// ─────────────────────────────────────────────────────────────

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BlogLanguage } from '@prisma/client';

export class BlogHeroTranslationDto {
  @IsEnum(BlogLanguage)
  language: BlogLanguage;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  heading?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  subheading?: string;
}

export class UpsertBlogsHeroDto {
  // Send the Cloudinary URL of the NEW image (already uploaded via /blogs-media/upload).
  // If you want to REMOVE the hero image, send heroImage: null.
  @IsOptional()
  @IsUrl()
  heroImage?: string | null;

  // Cloudinary publicId of the new image — needed for future deletion.
  @IsOptional()
  @IsString()
  heroImagePublicId?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogHeroTranslationDto)
  translations: BlogHeroTranslationDto[];
}
