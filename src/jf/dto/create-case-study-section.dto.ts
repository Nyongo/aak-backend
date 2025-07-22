import {
  IsString,
  IsNumber,
  IsEnum,
  IsObject,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SectionType } from '../interfaces/case-study-section.interface';

export class CreateCaseStudySectionDto {
  @IsString()
  caseStudyId: string;

  @IsNumber()
  order: number;

  @IsEnum(SectionType)
  type: SectionType;

  @IsBoolean() 
  isActive!: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  data: Record<string, any>;
}
