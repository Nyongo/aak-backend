import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  Length,
} from 'class-validator';

export class CreatePesticideDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100) // Name must be between 3 and 100 characters
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 50) // Registration number must be between 3 and 50 characters
  registrationNumber: string;

  @IsString()
  @IsNotEmpty()
  activeAgent: string;

  @IsString()
  @IsNotEmpty()
  manufacturerOfRegistrant: string;

  @IsString()
  @IsNotEmpty()
  localAgent: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}
