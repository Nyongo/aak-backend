import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAcademyCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  color?: string;
}
