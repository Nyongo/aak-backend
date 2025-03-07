import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { PermissionsGuard } from './auth/permission.guard';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { CommonFunctionsService } from './common/services/common-functions.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/server.key')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/server.cert')),
  };
  const host = process.env.HOST || 'localhost';
  const port = process.env.PORT || 3000;
  const app = await NestFactory.create(AppModule, { httpsOptions });
  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:4200', 'https://jf-foundation.vercel.app'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
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

  // await app.listen(3000);
  // await app.listen(3000, '0.0.0.0');
  await app.listen(port, host);
  console.log(`🚀 Server is running on https://${host}:${port}`);
}
bootstrap();
