import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
} from 'class-validator';

export class CreateCountyDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
