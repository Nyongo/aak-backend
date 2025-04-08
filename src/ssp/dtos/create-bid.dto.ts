import { IsNumber, IsNotEmpty, IsSemVer, IsOptional } from 'class-validator';

export class CreateBidDto {
  @IsNumber()
  @IsNotEmpty()
  serviceRequestId: number;

  @IsSemVer()
  @IsOptional()
  scheduleId: string;
}
