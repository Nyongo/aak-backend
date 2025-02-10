import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
  IsNumber,
} from 'class-validator';

export class CreateFarmerRequestDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  description: string;

  @IsNumber()
  @IsNotEmpty()
  farmerId: number;

  @IsNumber()
  @IsNotEmpty()
  farmId: number;

  @IsNumber()
  @IsOptional()
  assignedSspId: number;

  @IsString()
  @IsOptional()
  requestStatus: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
