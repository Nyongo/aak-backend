import {
  IsString, IsNotEmpty, IsOptional, IsEnum,
  IsBoolean, IsArray, IsDateString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AcademyGuideTranslationDto } from './academy-guide-translation.dto';

export class CreateAcademyGuideDto {
  @IsString()
  @IsNotEmpty()
  youtubeUrl: string;

  @IsString()
  @IsOptional()
  youtubeThumbnail?: string;

  @IsString()
  @IsOptional()
  duration?: string;

  @IsEnum(['DRAFT', 'COMING_SOON', 'PUBLISHED'])
  @IsOptional()
  status?: 'DRAFT' | 'COMING_SOON' | 'PUBLISHED';

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsDateString()
  @IsOptional()
  scheduledPublishAt?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcademyGuideTranslationDto)
  translations: AcademyGuideTranslationDto[];
}
