import { PartialType } from '@nestjs/mapped-types';
import { CreateImpactSurveySubmissionDto } from './create-impact-survey-submission.dto';

export class UpdateImpactSurveySubmissionDto extends PartialType(
  CreateImpactSurveySubmissionDto,
) {}

