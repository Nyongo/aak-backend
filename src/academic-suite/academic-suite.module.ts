import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { JfModule } from '../jf/jf.module';
import { CustomerController } from './controllers/customer.controller';
import { SchoolController } from './controllers/school.controller';
import { BusController } from './controllers/bus.controller';
import { DriverController } from './controllers/driver.controller';
import { MinderController } from './controllers/minder.controller';
import { ParentController } from './controllers/parent.controller';
import { StudentController } from './controllers/student.controller';
import { AddressController } from './controllers/address.controller';
import { RouteController } from './controllers/route.controller';
import { CustomerDbService } from './services/customer-db.service';
import { SchoolDbService } from './services/school-db.service';
import { BusDbService } from './services/bus-db.service';
import { DriverDbService } from './services/driver-db.service';
import { MinderDbService } from './services/minder-db.service';
import { ParentDbService } from './services/parent-db.service';
import { StudentDbService } from './services/student-db.service';
import { AddressDbService } from './services/address-db.service';
import { RouteDbService } from './services/route-db.service';
import { FileUploadService } from '../jf/services/file-upload.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/services/mail.service';

@Module({
  imports: [CommonModule, JfModule],
  providers: [
    PrismaService,
    CustomerDbService,
    SchoolDbService,
    BusDbService,
    DriverDbService,
    MinderDbService,
    ParentDbService,
    StudentDbService,
    AddressDbService,
    RouteDbService,
    FileUploadService,
    MailService,
  ],
  controllers: [
    CustomerController,
    SchoolController,
    BusController,
    DriverController,
    MinderController,
    ParentController,
    StudentController,
    AddressController,
    RouteController,
  ],
  exports: [
    CustomerDbService,
    SchoolDbService,
    BusDbService,
    DriverDbService,
    MinderDbService,
    ParentDbService,
    StudentDbService,
    AddressDbService,
    RouteDbService,
    FileUploadService,
  ],
})
export class AcademicSuiteModule {}
