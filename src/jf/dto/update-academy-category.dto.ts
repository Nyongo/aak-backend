import { IsString, IsOptional } from 'class-validator';

export class UpdateAcademyCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;
}
