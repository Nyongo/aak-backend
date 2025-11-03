import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateProductCategoryDto } from '../dtos/create-product-category.dto';
import { FileUploadService } from './file-upload.service';

@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(createDto: CreateProductCategoryDto) {
    try {
      const category = await this.prisma.productCategory.create({
        data: {
          name: createDto.name,
          status: createDto.status,
          description: createDto.description,
          imageUrl: createDto.imageUrl,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Product category created successfully.',
        category,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findAll() {
    try {
      const categories = await this.prisma.productCategory.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Product categories fetched successfully.',
        categories,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findOne(id: number) {
    try {
      const category = await this.prisma.productCategory.findUnique({
        where: { id },
      });

      if (!category) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Product category not found.',
          null,
        );
      }

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Product category retrieved successfully.',
        category,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(id: number, updateDto: Partial<CreateProductCategoryDto>) {
    try {
      const category = await this.prisma.productCategory.update({
        where: { id },
        data: updateDto,
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Product category updated successfully.',
        category,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async delete(id: number) {
    try {
      const category = await this.prisma.productCategory.findUnique({
        where: { id },
      });

      if (!category) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Product category not found.',
          null,
        );
      }

      // Delete the image file if it exists
      if (category.imageUrl) {
        await this.fileUploadService.deleteFile(category.imageUrl);
      }

      await this.prisma.productCategory.delete({
        where: { id },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Product category deleted successfully.',
        null,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}
