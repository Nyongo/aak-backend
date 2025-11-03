import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { ProductCategoriesController } from './controllers/product-categories.controller';
import { ProductCategoriesService } from './services/product-categories.service';
import { SuppliersController } from './controllers/suppliers.controller';
import { SuppliersService } from './services/suppliers.service';
import { ProductsController } from './controllers/products.controller';
import { ProductsService } from './services/products.service';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { SalesOrdersService } from './services/sales-orders.service';
import { FileUploadService } from './services/file-upload.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [
    ProductCategoriesController,
    SuppliersController,
    ProductsController,
    SalesOrdersController,
  ],
  providers: [
    ProductCategoriesService,
    SuppliersService,
    ProductsService,
    SalesOrdersService,
    CommonFunctionsService,
    FileUploadService,
  ],
})
export class EcommerceModule {}
