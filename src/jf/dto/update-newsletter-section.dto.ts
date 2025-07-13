import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsletterSectionDto } from './create-newsletter-section.dto';

export class UpdateNewsletterSectionDto extends PartialType(CreateNewsletterSectionDto) {}
