import { PartialType } from '@nestjs/mapped-types';
import { CreateImpactSurveyDto } from './create-impact-survey.dto';

export class UpdateImpactSurveyDto extends PartialType(
  CreateImpactSurveyDto,
) {}
