import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
} from 'class-validator';

export class CreatePestDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  scientificName: string;

  @IsString()
  @IsNotEmpty()
  kingdom: string;

  @IsString()
  @IsNotEmpty()
  phylum: string;

  @IsString()
  @IsNotEmpty()
  genus: string;

  @IsString()
  @IsNotEmpty()
  family: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}
