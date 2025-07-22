import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateNewsletterDto {
  @IsInt()
  @Min(0)
  order!: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  /** Whether this newsletter is active/published */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  /** Optional Data‑URL or upstream banner URL if you want to store that; actual blob handled by controller */
  @IsString()
  @IsOptional()
  bannerUrl?: string;
}
