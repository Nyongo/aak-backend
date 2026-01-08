import { PartialType } from '@nestjs/mapped-types';
import { CreatePrincipalTrancheDto } from './create-principal-tranche.dto';

export class UpdatePrincipalTrancheDto extends PartialType(
  CreatePrincipalTrancheDto,
) {}
