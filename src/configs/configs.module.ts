import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PesticidesService } from './services/pesticides.service';
import { PesticidesController } from './controllers/pesticides.controller';
import { PestsController } from './controllers/pests.controller';
import { PestsService } from './services/pests.service';
import { CountiesController } from './controllers/counties.controller';
import { CountiesService } from './services/counties.service';
import { ServiceTypesController } from './controllers/service-types.controller';
import { ServiceTypesService } from './services/service-types.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    PesticidesController,
    PestsController,
    CountiesController,
    ServiceTypesController,
  ],
  providers: [
    PesticidesService,
    PestsService,
    CountiesService,
    CommonFunctionsService,
    ServiceTypesService,
  ],
})
export class ConfigsModule {}
