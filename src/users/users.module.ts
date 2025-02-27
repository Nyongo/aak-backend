import { Module } from '@nestjs/common';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';
import { PermisssionsController } from './controllers/permissions.controller';
import { PermissionsService } from './services/permissions.service';
import { MailService } from 'src/common/services/mail.service';
import { AppsheetService } from './services/app-sheet.service';
import { AppsheetController } from './controllers/appsheet.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [
    UsersController,
    RolesController,
    PermisssionsController,
    AppsheetController,
  ],
  providers: [
    UsersService,
    CommonFunctionsService,
    MailService,
    RolesService,
    PermissionsService,
    AppsheetService,
  ],
})
export class UsersModule {}
