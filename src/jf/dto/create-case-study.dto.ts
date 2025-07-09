import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateCaseStudyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9\-]+$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens only',
  })
  slug: string;
}
