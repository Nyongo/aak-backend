import {
  IsString, IsNotEmpty, IsOptional, IsEnum,
  IsBoolean, IsArray, IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  /**
   * Using @Transform instead of @ValidateNested + @Type to prevent
   * class-transformer's enableImplicitConversion from calling Array.from()
   * on each bodyContent item (a plain object), which returns [] because
   * plain objects have no length or Symbol.iterator.
   */
  @IsArray()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return [];
    return value.map((t: any) => ({
      language:    typeof t?.language    === 'string' ? t.language    : '',
      title:       typeof t?.title       === 'string' ? t.title       : '',
      description: typeof t?.description === 'string' ? t.description : '',
      bodyContent: Array.isArray(t?.bodyContent) ? t.bodyContent : [],
    }));
  })
  translations: {
    language:    string;
    title:       string;
    description: string;
    bodyContent: any[];
  }[];
}
