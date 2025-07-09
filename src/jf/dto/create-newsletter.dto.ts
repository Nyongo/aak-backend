import { IsString, IsNotEmpty, IsDateString, IsEnum } from 'class-validator';
import { NewsletterCategory } from '../interfaces/newsletter.interface';

export class CreateNewsletterDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsNotEmpty()
  description: string;

  @IsDateString()
  date: string;

  @IsEnum(NewsletterCategory)
  category: NewsletterCategory;
}
