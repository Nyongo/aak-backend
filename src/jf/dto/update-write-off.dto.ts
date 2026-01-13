import { PartialType } from '@nestjs/mapped-types';
import { CreateWriteOffDto } from './create-write-off.dto';

export class UpdateWriteOffDto extends PartialType(CreateWriteOffDto) {}
