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
import * as fs from 'fs'; // Not needed for local development (SSL disabled)
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const host = process.env.HOST || 'localhost';
  const port = process.env.PORT || 3000;

  // SSL configuration - only use if certificates exist
  let app: NestExpressApplication;
  try {
    const sslKeyPath = process.env.SSL_KEY_PATH || 'ssl/server.key';
    const sslCertPath = process.env.SSL_CERT_PATH || 'ssl/server.cert';

    if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
      const httpsOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      };
      console.log('🔒 Using HTTPS with SSL certificates', {
        keyPath: sslKeyPath,
        certPath: sslCertPath,
      });
      app = await NestFactory.create<NestExpressApplication>(AppModule, {
        httpsOptions,
      });
    } else {
      throw new Error(
        `SSL files not found at configured paths: key=${sslKeyPath}, cert=${sslCertPath}`,
      );
    }
  } catch (error) {
    console.log('⚠️  SSL certificates not found or invalid, using HTTP');
    if (error instanceof Error) {
      console.log('   Error:', error.message);
    } else {
      console.log('   Error:', String(error));
    }
    app = await NestFactory.create<NestExpressApplication>(AppModule, {});
  }
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
      'https://www.jackfruitnetwork.com/',
      'https://www.finance.jackfruitnetwork.com',
      'https://finance.jackfruitnetwork.com',
      'https://www.hub.jackfruitnetwork.com',
      'https://hub.jackfruitnetwork.com',
      'http://localhost:8080',
      'https://www.jackfruitfinance.com',
      'https://jackfruitfinance.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  // Serve static files from project root uploads directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
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

  // Apply global validation pipe with transformation so numeric strings become numbers
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(port, host);
  console.log(`🚀 Server is running on ${host}:${port}`);
}
bootstrap();
