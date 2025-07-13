import { PartialType } from '@nestjs/mapped-types';
import { CreateCaseStudySectionDto } from './create-case-study-section.dto';

export class UpdateCaseStudySectionDto extends PartialType(
  CreateCaseStudySectionDto,
) {}
