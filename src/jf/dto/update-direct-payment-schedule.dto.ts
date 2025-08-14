import { PartialType } from '@nestjs/mapped-types';
import { CreateDirectPaymentScheduleDto } from './create-direct-payment-schedule.dto';

export class UpdateDirectPaymentScheduleDto extends PartialType(
  CreateDirectPaymentScheduleDto,
) {}
