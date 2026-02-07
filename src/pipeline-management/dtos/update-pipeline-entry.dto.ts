import { PartialType } from '@nestjs/mapped-types';
import { CreatePipelineEntryDto } from './create-pipeline-entry.dto';

export class UpdatePipelineEntryDto extends PartialType(CreatePipelineEntryDto) {}
