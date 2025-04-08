import { Module } from '@nestjs/common';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleAuthController } from './controllers/google-auth.controller';
import { GoogleDriveService } from './services/google-drive.service';
import { SpreadsheetService } from './services/spread-sheet.service';
import { SpreadsheetController } from './controllers/spread-sheet.controller';
import { NotificationController } from './controllers/notification.controller';
import { MailService } from '../common/services/mail.service';

@Module({
  providers: [
    GoogleAuthService,
    GoogleDriveService,
    SpreadsheetService,
    MailService,
  ],
  controllers: [
    GoogleAuthController,
    SpreadsheetController,
    NotificationController,
  ],
})
export class JfModule {}
