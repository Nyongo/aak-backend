import { IsString, IsArray, ArrayNotEmpty, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class SectionOrder {
  @IsString()
  id!: string;

  @IsInt()
  order!: number;
}

export class ReorderSectionsDto {
  @IsString()
  caseStudyId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SectionOrder)
  sections!: SectionOrder[];
}
