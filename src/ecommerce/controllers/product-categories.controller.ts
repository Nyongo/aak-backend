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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { ProductCategoriesService } from '../services/product-categories.service';
import { CreateProductCategoryDto } from '../dtos/create-product-category.dto';
import { FileUploadService } from '../services/file-upload.service';

@Controller('ecommerce/categories')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductCategoriesController {
  constructor(
    private readonly service: ProductCategoriesService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('categoryImage'))
  async create(
    @Body() data: CreateProductCategoryDto,
    @UploadedFile() categoryImage?: Express.Multer.File,
  ) {
    try {
      let imageUrl = data.imageUrl;

      // Handle file upload if provided
      if (categoryImage) {
        // Validate file type
        const allowedTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/svg+xml',
        ];
        if (!allowedTypes.includes(categoryImage.mimetype)) {
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
        if (categoryImage.size > maxSize) {
          return {
            response: {
              code: 400,
              message: 'File size exceeds 2MB limit.',
            },
            data: null,
          };
        }

        const customName = `category_${data.name.toLowerCase().replace(/\s+/g, '_')}`;
        imageUrl = await this.fileUploadService.saveFile(
          categoryImage,
          'categories',
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
          : 'An error occurred while creating the category.';
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
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @HttpCode(200)
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('categoryImage'))
  async update(
    @Param('id') id: string,
    @Body() data: Partial<CreateProductCategoryDto>,
    @UploadedFile() categoryImage?: Express.Multer.File,
  ) {
    try {
      let imageUrl = data.imageUrl;

      // Handle file upload if provided
      if (categoryImage) {
        // Validate file type
        const allowedTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/svg+xml',
        ];
        if (!allowedTypes.includes(categoryImage.mimetype)) {
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
        if (categoryImage.size > maxSize) {
          return {
            response: {
              code: 400,
              message: 'File size exceeds 2MB limit.',
            },
            data: null,
          };
        }

        const customName = `category_${data.name?.toLowerCase().replace(/\s+/g, '_') || Date.now()}`;
        imageUrl = await this.fileUploadService.saveFile(
          categoryImage,
          'categories',
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
          : 'An error occurred while updating the category.';
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
