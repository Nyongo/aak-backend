import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateBidDto {
  @IsNumber()
  @IsNotEmpty()
  serviceRequestId: number;

  @IsNumber()
  @IsNotEmpty()
  scheduleId: number;
}
