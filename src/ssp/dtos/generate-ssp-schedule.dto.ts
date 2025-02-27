import { IsInt, IsOptional, Min, Max, IsDateString } from 'class-validator';

export class GenerateSspScheduleDto {
  @IsInt()
  sspId: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  startHour = 9;

  @IsInt()
  @Min(1)
  @Max(24)
  @IsOptional()
  endHour = 17;

  @IsInt()
  @Min(15)
  @Max(180)
  @IsOptional()
  duration = 60;
}
