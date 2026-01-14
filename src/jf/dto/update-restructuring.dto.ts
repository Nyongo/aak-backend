import { PartialType } from '@nestjs/mapped-types';
import { CreateRestructuringDto } from './create-restructuring.dto';

export class UpdateRestructuringDto extends PartialType(CreateRestructuringDto) {}
