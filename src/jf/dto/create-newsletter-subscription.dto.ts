import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateNewsletterSubscriptionDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  interests?: string;

  @IsOptional()
  @IsString()
  platform?: string;
}
