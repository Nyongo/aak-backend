import { Module } from '@nestjs/common';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleAuthController } from './controllers/google-auth.controller';
import { GoogleDriveService } from './services/google-drive.service';
import { SpreadsheetService } from './services/spread-sheet.service';
import { SpreadsheetController } from './controllers/spread-sheet.controller';

@Module({
  providers: [GoogleAuthService, GoogleDriveService, SpreadsheetService],
  controllers: [GoogleAuthController, SpreadsheetController],
})
export class JfModule {}
