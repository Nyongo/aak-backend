// Crypto polyfill for @nestjs/schedule
import { webcrypto } from 'crypto';
if (!global.crypto) {
  global.crypto = webcrypto as any;
}

import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { PermissionsGuard } from './auth/permission.guard';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { CommonFunctionsService } from './common/services/common-functions.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import * as fs from 'fs';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync('ssl/server.key'),
    cert: fs.readFileSync('ssl/server.cert'),
  };

  const host = process.env.HOST || 'localhost';
  const port = process.env.PORT || 3000;
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions,
  });
  //const app = await NestFactory.create<NestExpressApplication>(AppModule, {});
  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:4000',
      'https://jf-foundation.vercel.app',
      'https://jackfruit-foundation.org',
      'https://www.jackfruit-foundation.org',
      'https://crm-ochre-pi.vercel.app',
      'https://foundation.jackfruitnetwork.com',
      'https://www.foundation.jackfruitnetwork.com',
      'https://www.jackfruitnetwork.com',
      'https://jackfruitnetwork.com',
      'https://www.finance.jackfruitnetwork.com',
      'https://finance.jackfruitnetwork.com',
      'http://localhost:8080',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const commonFunctionsService = app.get(CommonFunctionsService);
  const prismaService = app.get(PrismaService);
  const reflector = app.get(Reflector);

  // Apply the guards directly without using 'provide'
  app
    .useGlobalGuards
    // new JwtAuthGuard(), // Instantiate JwtAuthGuard
    // new PermissionsGuard(reflector, prismaService, commonFunctionsService), // Instantiate PermissionsGuard
    ();

  // Apply global filters
  app.useGlobalFilters(new ValidationExceptionFilter());
  app.useGlobalFilters(new PrismaExceptionFilter());

  await app.listen(port, host);
  console.log(`🚀 Server is running on https://${host}:${port}`);
}
bootstrap();
