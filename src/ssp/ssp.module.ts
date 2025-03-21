import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { SspUsersController } from './controllers/ssp-users.controller';
import { SspUsersService } from './services/ssp-users.service';
import { UsersService } from 'src/users/users.service';
import { MailService } from 'src/common/services/mail.service';
import { FarmerUsersService } from './services/farmer-users.service';
import { FaremerUsersController } from './controllers/farmer-users.controller';
import { FarmerFarmsController } from './controllers/farmer-farms.controller';
import { FarmsService } from './services/farms.service';
import { FarmerRequestsController } from './controllers/farmer-requests.controller';
import { FarmRequestsService } from './services/farmer-requests.service';
import { CropsInFarmController } from './controllers/crops-in-farm.controller';
import { CropsInFarmService } from './services/crops-in-farm.service';
import { SspScheduleController } from './controllers/ssp-schedule.controller';
import { SspScheduleService } from './services/ssp-schedule.service';
import { BiddingController } from './controllers/bidding.controller';
import { BiddingService } from './services/bidding.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SspUsersController,
    FaremerUsersController,
    FarmerFarmsController,
    FarmerRequestsController,
    CropsInFarmController,
    SspScheduleController,
    BiddingController,
  ],
  providers: [
    CommonFunctionsService,
    SspUsersService,
    UsersService,
    MailService,
    FarmerUsersService,
    FarmsService,
    FarmRequestsService,
    CropsInFarmService,
    SspScheduleService,
    BiddingService,
  ],
})
export class SspModule {}
