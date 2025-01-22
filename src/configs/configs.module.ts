import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PesticidesService } from './services/pesticides.service';
import { PesticidesController } from './controllers/pesticides.controller';
import { PestsController } from './controllers/pests.controller';
import { PestsService } from './services/pests.service';
import { CountiesController } from './controllers/counties.controller';
import { CountiesService } from './services/counties.service';

@Module({
  imports: [PrismaModule],
  controllers: [PesticidesController, PestsController, CountiesController],
  providers: [
    PesticidesService,
    PestsService,
    CountiesService,
    CommonFunctionsService,
  ],
})
export class ConfigsModule {}
