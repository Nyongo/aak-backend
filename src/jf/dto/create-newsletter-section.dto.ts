import { IsString, IsInt, Min, IsEnum, IsObject } from 'class-validator';
import { SectionType } from '@prisma/client';

export class CreateNewsletterSectionDto {
  @IsString() newsletterId!: string;
  @IsInt() @Min(0) order!: number;
  @IsEnum(SectionType) type!: SectionType;
  @IsObject() data!: Record<string, any>;
}
