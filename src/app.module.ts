import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { ConfigsModule } from './configs/configs.module';
import { ConfigModule } from '@nestjs/config';
import { SspModule } from './ssp/ssp.module';
import { JfModule } from './jf/jf.module';
import { SslTrackerModule } from './ssl-tracker/ssl-tracker.module';
import { FleetModule } from './fleet/fleet.module';
import { AcademicSuiteModule } from './academic-suite/academic-suite.module';
import { GoogleDriveModule } from 'nestjs-google-drive';
import { EcommerceModule } from './ecommerce/ecommerce.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the config available globally
      envFilePath: '.env', // Path to the .env file
    }),
    UsersModule,
    AuthModule,
    ConfigsModule,
    SspModule,
    JfModule,
    SslTrackerModule,
    FleetModule,
    AcademicSuiteModule,
    EcommerceModule,
    GoogleDriveModule.register({
      clientId: 'your_google_client_id',
      clientSecret: 'your_google_client_secret',
      redirectUrl: 'redirection_url',
      refreshToken: 'your_refresh_token',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
