import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateSupplierDto } from '../dtos/create-supplier.dto';
import { FileUploadService } from './file-upload.service';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(createDto: CreateSupplierDto) {
    try {
      const supplier = await this.prisma.supplier.create({
        data: {
          company: createDto.company,
          contactPerson: createDto.contactPerson,
          email: createDto.email,
          phone: createDto.phone,
          logoUrl: createDto.logoUrl,
          categoryId: createDto.categoryId,
          notes: createDto.notes,
          status: createDto.status || 'Active',
        },
        include: {
          category: true,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Supplier created successfully.',
        supplier,
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
      const suppliers = await this.prisma.supplier.findMany({
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Suppliers fetched successfully.',
        suppliers,
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
      const supplier = await this.prisma.supplier.findUnique({
        where: { id },
        include: {
          category: true,
        },
      });

      if (!supplier) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Supplier not found.',
          null,
        );
      }

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Supplier retrieved successfully.',
        supplier,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(id: number, updateDto: Partial<CreateSupplierDto>) {
    try {
      const supplier = await this.prisma.supplier.update({
        where: { id },
        data: updateDto,
        include: {
          category: true,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Supplier updated successfully.',
        supplier,
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
      const supplier = await this.prisma.supplier.findUnique({
        where: { id },
      });

      if (!supplier) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Supplier not found.',
          null,
        );
      }

      // Delete the logo file if it exists
      if (supplier.logoUrl) {
        await this.fileUploadService.deleteFile(supplier.logoUrl);
      }

      await this.prisma.supplier.delete({
        where: { id },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Supplier deleted successfully.',
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
