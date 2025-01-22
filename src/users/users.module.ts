import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController, RolesController],
  providers: [UsersService, CommonFunctionsService, RolesService],
})
export class UsersModule {}
