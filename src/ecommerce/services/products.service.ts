import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { FileUploadService } from './file-upload.service';
import { ListProductsDto } from '../dtos/list-products.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(createDto: CreateProductDto) {
    try {
      const product = await this.prisma.product.create({
        data: {
          name: createDto.name,
          supplierId: createDto.supplierId,
          categoryId: createDto.categoryId,
          price: createDto.price,
          stock: createDto.stock || 0,
          imageUrl: createDto.imageUrl,
          description: createDto.description,
          status: createDto.status || 'Active',
        },
        include: {
          supplier: true,
          category: true,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Product created successfully.',
        product,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findAll(filters?: ListProductsDto) {
    try {
      const where: any = {};

      if (filters) {
        const andConditions: any[] = [];
        if (typeof filters.categoryId === 'number') {
          andConditions.push({ categoryId: filters.categoryId });
        }
        if (typeof filters.supplierId === 'number') {
          andConditions.push({ supplierId: filters.supplierId });
        }
        if (filters.search && filters.search.trim().length > 0) {
          const q = filters.search.trim();
          andConditions.push({
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          });
        }
        if (andConditions.length > 0) {
          where.AND = andConditions;
        }
      }

      const products = await this.prisma.product.findMany({
        where: Object.keys(where).length ? where : undefined,
        include: {
          supplier: true,
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Products fetched successfully.',
        products,
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
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          supplier: true,
          category: true,
        },
      });

      if (!product) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Product not found.',
          null,
        );
      }

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Product retrieved successfully.',
        product,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(id: number, updateDto: UpdateProductDto) {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: updateDto,
        include: {
          supplier: true,
          category: true,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Product updated successfully.',
        product,
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
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Product not found.',
          null,
        );
      }

      // Delete the image file if it exists
      if (product.imageUrl) {
        await this.fileUploadService.deleteFile(product.imageUrl);
      }

      await this.prisma.product.delete({
        where: { id },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Product deleted successfully.',
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
