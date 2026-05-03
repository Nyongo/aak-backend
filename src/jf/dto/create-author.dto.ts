import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BlogLanguage } from '@prisma/client';

export class AuthorTranslationDto {
  @IsEnum(BlogLanguage)
  language: BlogLanguage;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string | null;
}

export class CreateAuthorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsUrl()
  image?: string;

  @IsOptional()
  @IsString()
  imagePublicId?: string;

  // ── Extended profile ──────────────────────────────────────
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  yearsAtJF?: number;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  education?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  expertise?: string;

  // ── Translations (role + bio per language) ────────────────
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AuthorTranslationDto)
  translations?: AuthorTranslationDto[];

  // ── SEO ───────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaKeywords?: string;
}
