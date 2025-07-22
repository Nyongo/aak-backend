import {
  IsString,
  IsNotEmpty,
  Matches,
  IsNumber,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';

export class CreateCaseStudyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\/case-studies\/[a-z0-9-]+$/, {
    message: 'link must be like "/case-studies/<slug>"',
  })
  link: string;

  @IsNumber()
  order: number;

  @IsString()
  title: string;

  @IsString()
  description: string;

  // exactly 3 stats expected; will be truncated server‑side too
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  stats: any[];

  @IsBoolean()
  isActive: boolean;
}
