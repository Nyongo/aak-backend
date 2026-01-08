import { PartialType } from '@nestjs/mapped-types';
import { CreateDirectLendingProcessingDto } from './create-direct-lending-processing.dto';

export class UpdateDirectLendingProcessingDto extends PartialType(
  CreateDirectLendingProcessingDto,
) {}
