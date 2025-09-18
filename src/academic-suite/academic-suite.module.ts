import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { JfModule } from '../jf/jf.module';
import { CustomerController } from './controllers/customer.controller';
import { CustomerDbService } from './services/customer-db.service';
import { FileUploadService } from '../jf/services/file-upload.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/services/mail.service';

@Module({
  imports: [CommonModule, JfModule],
  providers: [PrismaService, CustomerDbService, FileUploadService, MailService],
  controllers: [CustomerController],
  exports: [CustomerDbService, FileUploadService],
})
export class AcademicSuiteModule {}
