import { IsIn, IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class AcademyGuideTranslationDto {
  @IsIn(['EN', 'KIS'])
  language: 'EN' | 'KIS';

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  /**
   * @Transform bypasses class-transformer's implicit conversion so the
   * block objects ({ type, text } | { type, items[] }) are never mangled
   * by whitelist stripping of their nested properties.
   */
  @IsOptional()
  @IsArray()
  bodyContent?: any[];
}
