import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreatePestDto } from '../dto/create-pest.dto';

@Injectable()
export class PestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async create(createDto: CreatePestDto) {
    try {
      const data: any = {
        name: createDto.name,
        scientificName: createDto.scientificName,
        kingdom: createDto.kingdom,
        phylum: createDto.phylum,
        genus: createDto.genus,
        family: createDto.family,
        published: createDto.published ?? false,
      };

      const newRecord = await this.prisma.pest.create({
        data,
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Created successfully.',
        newRecord,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findAll(page: number = 1, pageSize: number = 10) {
    try {
      const skip = (page - 1) * pageSize;
      const take = pageSize;
      const [data, totalItems] = await Promise.all([
        this.prisma.pest.findMany({
          skip,
          take,
        }),
        this.prisma.pest.count(),
      ]);

      const totalPages = Math.ceil(totalItems / pageSize);

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fetched Records',
        {
          data,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            pageSize,
          },
        },
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findOne(
    id: number,
  ): Promise<{ response: { code: number; message: string }; data: any }> {
    try {
      const record = await this.prisma.pest.findUnique({
        where: { id },
      });
      if (!record) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'No record found',
          null,
        );
      }
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Retrieved Successfully',
        record,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(
    id: number,
    updateDto: any,
  ): Promise<{ response: { code: number; message: string }; data: any }> {
    try {
      const updatedRecord = await this.prisma.pest.update({
        where: { id },
        data: updateDto,
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Updated Successfully',
        updatedRecord,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async delete(
    id: number,
  ): Promise<{ response: { code: number; message: string }; data: any }> {
    try {
      const record = await this.prisma.pest.findUnique({
        where: { id },
      });
      return this.commonFunctions.returnFormattedResponse(
        200,
        'Deleted Successfully',
        record,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}
