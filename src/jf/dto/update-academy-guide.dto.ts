import { PartialType } from '@nestjs/mapped-types';
import { CreateAcademyGuideDto } from './create-academy-guide.dto';

export class UpdateAcademyGuideDto extends PartialType(CreateAcademyGuideDto) {}
