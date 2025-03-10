import { Transform } from 'class-transformer';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
  IsNumber,
  IsDate,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
} from 'class-validator';

export class CreateFarmerRequestDto {
  @IsDate()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  requestDate: Date;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  description: string;

  @IsNumber()
  @IsNotEmpty()
  farmerId: number;

  @IsArray() // Ensure it's an array
  @ArrayNotEmpty() // Ensure it's not empty
  @ArrayMinSize(1) // Optional: Ensure at least one service ID is provided
  @IsNumber({}, { each: true }) // Ensure each element in the array is a number
  requestedServicesIds: number[];

  @IsNumber()
  @IsNotEmpty()
  farmId: number;

  @IsNumber()
  @IsOptional()
  assignedSspId: number;

  @IsArray() // Ensure it's an array
  @IsOptional()
  //@ArrayNotEmpty() // Ensure it's not empty
  // @ArrayMinSize(1) // Optional: Ensure at least one service ID is provided
  @IsNumber({}, { each: true }) // Ensure each element in the array is a number
  sspScheduleIds: number[];

  @IsArray() // Ensure it's an array
  @IsOptional()
  @IsNumber({}, { each: true }) // Ensure each element in the array is a number
  cropsIds: number[];

  @IsString()
  @IsOptional()
  requestStatus: string;

  @IsString()
  @IsOptional()
  urgency: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
