import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  IsJSON,
} from 'class-validator';
import { SectionType } from '../interfaces/newsletter-section.interface';

export class CreateNewsletterSectionDto {
  @IsString() @IsNotEmpty()
  newsletterId: string;

  @IsEnum(SectionType)
  type: SectionType;

  @IsInt() @Min(0)
  order: number;

  @IsJSON()
  data: any;
}
