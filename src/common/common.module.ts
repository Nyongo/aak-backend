import { Module } from '@nestjs/common';
import { CommonFunctionsService } from './services/common-functions.service';

@Module({
  providers: [CommonFunctionsService],
  exports: [CommonFunctionsService],
})
export class CommonModule {}
