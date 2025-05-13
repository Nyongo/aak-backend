import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @Length(1, 100)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  address?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  postalAddress?: string;
}
