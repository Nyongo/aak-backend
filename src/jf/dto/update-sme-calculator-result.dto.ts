import { PartialType } from '@nestjs/mapped-types';
import { CreateSmeCalculatorResultDto } from './create-sme-calculator-result.dto';

export class UpdateSmeCalculatorResultDto extends PartialType(
  CreateSmeCalculatorResultDto,
) {}

