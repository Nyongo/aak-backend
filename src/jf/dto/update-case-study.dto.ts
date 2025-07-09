import { PartialType } from '@nestjs/mapped-types';
import { CreateCaseStudyDto } from './create-case-study.dto';

export class UpdateCaseStudyDto extends PartialType(CreateCaseStudyDto) {}
