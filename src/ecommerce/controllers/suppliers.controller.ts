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
import { SuppliersService } from '../services/suppliers.service';
import { CreateSupplierDto } from '../dtos/create-supplier.dto';
import { FileUploadService } from '../services/file-upload.service';

@Controller('ecommerce/suppliers')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(
    private readonly service: SuppliersService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('companyLogo'))
  async create(
    @Body() data: CreateSupplierDto,
    @UploadedFile() companyLogo?: Express.Multer.File,
  ) {
    try {
      let logoUrl = data.logoUrl;

      // Handle file upload if provided
      if (companyLogo) {
        // Validate file type
        const allowedTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/svg+xml',
        ];
        if (!allowedTypes.includes(companyLogo.mimetype)) {
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
        if (companyLogo.size > maxSize) {
          return {
            response: {
              code: 400,
              message: 'File size exceeds 2MB limit.',
            },
            data: null,
          };
        }

        const customName = `supplier_${data.company.toLowerCase().replace(/\s+/g, '_')}`;
        logoUrl = await this.fileUploadService.saveFile(
          companyLogo,
          'suppliers',
          customName,
        );
      }

      const result = await this.service.create({
        ...data,
        logoUrl,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while creating the supplier.';
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
  @UseInterceptors(FileInterceptor('companyLogo'))
  async update(
    @Param('id') id: string,
    @Body() data: Partial<CreateSupplierDto>,
    @UploadedFile() companyLogo?: Express.Multer.File,
  ) {
    try {
      let logoUrl = data.logoUrl;

      // Handle file upload if provided
      if (companyLogo) {
        // Validate file type
        const allowedTypes = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/svg+xml',
        ];
        if (!allowedTypes.includes(companyLogo.mimetype)) {
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
        if (companyLogo.size > maxSize) {
          return {
            response: {
              code: 400,
              message: 'File size exceeds 2MB limit.',
            },
            data: null,
          };
        }

        const customName = `supplier_${data.company?.toLowerCase().replace(/\s+/g, '_') || Date.now()}`;
        logoUrl = await this.fileUploadService.saveFile(
          companyLogo,
          'suppliers',
          customName,
        );
      }

      const result = await this.service.update(Number(id), {
        ...data,
        logoUrl,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while updating the supplier.';
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
