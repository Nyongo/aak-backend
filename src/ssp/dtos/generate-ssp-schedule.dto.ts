import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Length,
  IsNumber,
} from 'class-validator';

export class GenerateSspScheduleDto {
  @IsNumber()
  @IsNotEmpty()
  sspId: number;

  @IsNumber()
  @IsOptional()
  startHour: number;

  @IsNumber()
  @IsOptional()
  endHour: number;

  @IsNumber()
  @IsOptional()
  duration: number;
}
