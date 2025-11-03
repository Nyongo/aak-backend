import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { ListProductsDto } from '../dtos/list-products.dto';
import { FileUploadService } from '../services/file-upload.service';

@Controller('ecommerce/products')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(
    private readonly service: ProductsService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('productImage'))
  async create(
    @Body() data: CreateProductDto,
    @UploadedFile() productImage?: Express.Multer.File,
  ) {
    try {
      let imageUrl = data.imageUrl;

      // Handle file upload if provided
      if (productImage) {
        // Validate file type
        const allowedTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/svg+xml',
        ];
        if (!allowedTypes.includes(productImage.mimetype)) {
          return {
            response: {
              code: 400,
              message:
                'Invalid file type. Only PNG, JPG, and SVG files are allowed.',
            },
            data: null,
          };
        }

        // Validate file size (2MB = 2 * 1024 * 1024 bytes)
        const maxSize = 2 * 1024 * 1024;
        if (productImage.size > maxSize) {
          return {
            response: {
              code: 400,
              message: 'File size exceeds 2MB limit.',
            },
            data: null,
          };
        }

        const customName = `product_${data.name.toLowerCase().replace(/\s+/g, '_')}`;
        imageUrl = await this.fileUploadService.saveFile(
          productImage,
          'products',
          customName,
        );
      }

      const result = await this.service.create({
        ...data,
        imageUrl,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while creating the product.';
      return {
        response: {
          code: 500,
          message: errorMessage,
        },
        data: null,
      };
    }
  }

  @Get()
  @HttpCode(200)
  async findAll(@Query() query: ListProductsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @HttpCode(200)
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('productImage'))
  async update(
    @Param('id') id: string,
    @Body() data: UpdateProductDto,
    @UploadedFile() productImage?: Express.Multer.File,
  ) {
    try {
      let imageUrl = data.imageUrl;

      // Handle file upload if provided
      if (productImage) {
        // Validate file type
        const allowedTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/svg+xml',
        ];
        if (!allowedTypes.includes(productImage.mimetype)) {
          return {
            response: {
              code: 400,
              message:
                'Invalid file type. Only PNG, JPG, and SVG files are allowed.',
            },
            data: null,
          };
        }

        // Validate file size (2MB = 2 * 1024 * 1024 bytes)
        const maxSize = 2 * 1024 * 1024;
        if (productImage.size > maxSize) {
          return {
            response: {
              code: 400,
              message: 'File size exceeds 2MB limit.',
            },
            data: null,
          };
        }

        const customName = `product_${data.name?.toLowerCase().replace(/\s+/g, '_') || Date.now()}`;
        imageUrl = await this.fileUploadService.saveFile(
          productImage,
          'products',
          customName,
        );
      }

      const result = await this.service.update(Number(id), {
        ...data,
        imageUrl,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while updating the product.';
      return {
        response: {
          code: 500,
          message: errorMessage,
        },
        data: null,
      };
    }
  }

  @Delete(':id')
  @HttpCode(200)
  async delete(@Param('id') id: string) {
    return this.service.delete(Number(id));
  }
}
