import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateFarmerRequestDto } from '../dtos/create-farmer-request.dto';

@Injectable()
export class FarmRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async create(createDto: CreateFarmerRequestDto) {
    try {
      const data: any = {
        farmerId: createDto.farmerId,
        description: createDto.description,
        farmId: createDto.farmId,
        assignedSspId: createDto.assignedSspId,
        urgency: createDto.urgency,
        isPublished: createDto.isPublished,
        requestStatus: createDto.requestStatus ?? 'Not Started',
        isActive: createDto.isActive ?? false,
        requestDate: createDto.requestDate,
      };

      const newRecord = await this.prisma.serviceRequest.create({
        data,
      });

      if (newRecord && createDto.requestedServicesIds?.length) {
        // ✅ Check if all requestedServicesIds exist in the service type table
        const existingServices = await this.prisma.serviceType.findMany({
          where: {
            id: { in: createDto.requestedServicesIds },
          },
          select: { id: true },
        });

        const existingServiceIds = existingServices.map((s) => s.id);
        const invalidIds = createDto.requestedServicesIds.filter(
          (id) => !existingServiceIds.includes(id),
        );

        if (invalidIds.length) {
          return this.commonFunctions.returnFormattedResponse(
            HttpStatus.BAD_REQUEST,
            `Invalid serviceTypeIds: ${invalidIds.join(', ')}`,
            [],
          );
        }

        // ✅ Insert only valid serviceTypeIds
        await Promise.all(
          createDto.requestedServicesIds.map((id) =>
            this.prisma.serviceRequestService.create({
              data: {
                serviceTypeId: id,
                serviceRequestId: newRecord.id,
              },
            }),
          ),
        );
        // Save Bid if assignedSspId
        if (createDto.assignedSspId) {
          await this.prisma.sspBidding.create({
            data: {
              serviceRequestId: newRecord.id,
              sspId: createDto.assignedSspId,
              farmerId: createDto.farmerId,
              //  scheduleId: createDto.sspScheduleIds[0],
              requestedByFarmer: true,
            },
          });
        }
      }

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
        this.prisma.serviceRequest.findMany({
          skip,
          take,
        }),
        this.prisma.serviceRequest.count(),
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
      const record = await this.prisma.serviceRequest.findUnique({
        where: { id },
        include: {
          farm: {
            include: { county: true },
          },
          farmer: true,
          assignedSsp: true,
          servicesRequested: {
            include: {
              serviceType: true,
            },
          },
          bids: {
            include: {
              ssp: true,
            },
          },
        },
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
      const updatedRecord = await this.prisma.serviceRequest.update({
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
      const record = await this.prisma.serviceRequest.findUnique({
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

  async findFarmerRequests(farmerId: number) {
    try {
      const data = await this.prisma.serviceRequest.findMany({
        where: { farmerId },
        include: {
          farm: {
            include: { county: true },
          },
          farmer: true,
          assignedSsp: true,
        },
      });
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fetched Records',
        data,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
  async findSspRequests(sspId: number) {
    try {
      const data = await this.prisma.serviceRequest.findMany({
        where: { assignedSspId: sspId },
        include: {
          farm: true,
          farmer: true,
          assignedSsp: true,
        },
      });
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Fetched Records',
        data,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}
