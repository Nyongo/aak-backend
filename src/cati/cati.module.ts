import { Module } from '@nestjs/common';
import { CallListController } from './controllers/call-list.controller';
import { MulterModule } from '@nestjs/platform-express';
import { DownloadService } from './download.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      dest: './upload',
    }),
  ],
  exports: [],
  providers: [DownloadService, CommonFunctionsService],
  controllers: [CallListController],
})
export class CatiModule {}
