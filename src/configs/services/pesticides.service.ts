import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Pesticide } from '@prisma/client';

@Injectable()
export class PesticidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async create(createDto: any) {
    try {
      const data: any = {
        name: createDto.name,
        registrationNumber: createDto.registrationNumber,
        activeAgent: createDto.activeAgent,
        manufacturerOfRegistrant: createDto.manufacturerOfRegistrant,
        localAgent: createDto.localAgent,
        published: createDto.published ?? false,
      };
      if (createDto.createdBy) data.createdBy = createDto.createdBy;
      if (createDto.lastUpdatedBy) data.lastUpdatedBy = createDto.lastUpdatedBy;
      if (createDto.lastUpdatedAt) data.lastUpdatedAt = createDto.lastUpdatedAt;

      const newPesticide = await this.prisma.pesticide.create({
        data,
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          activeAgent: true,
          manufacturerOfRegistrant: true,
          localAgent: true,
          published: true,
          createdBy: true,
          lastUpdatedBy: true,
          lastUpdatedAt: true,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Pesticide created successfully.',
        newPesticide,
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
        this.prisma.pesticide.findMany({
          skip,
          take,
        }),
        this.prisma.pesticide.count(),
      ]);

      const totalPages = Math.ceil(totalItems / pageSize);

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fetched Pesticides',
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
      const record = await this.prisma.pesticide.findUnique({
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
      const updatedRecord = await this.prisma.pesticide.update({
        where: { id },
        data: updateDto,
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          activeAgent: true,
          manufacturerOfRegistrant: true,
          localAgent: true,
          published: true,
          createdBy: true,
          lastUpdatedBy: true,
          lastUpdatedAt: true,
        },
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
      const record = await this.prisma.pesticide.findUnique({
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
