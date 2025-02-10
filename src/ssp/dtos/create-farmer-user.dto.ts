import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
} from 'class-validator';

export class CreateFarmerUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  firstName: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  middleName: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  lastName: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  gender: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  dob: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
