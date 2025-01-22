import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
    }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, CommonFunctionsService],
  controllers: [AuthController],
})
export class AuthModule {}
