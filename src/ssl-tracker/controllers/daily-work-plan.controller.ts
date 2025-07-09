import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Logger,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from '../../common/services/common-functions.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('daily-work-plans')
export class DailyWorkPlanController {
  private readonly logger = new Logger(DailyWorkPlanController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  @Get()
  async getAllDailyWorkPlans(
    @Query('sslStaffId') sslStaffId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    console.log('+++++++==', 'Here');
    try {
      this.logger.debug(
        `Fetching daily work plans${sslStaffId ? ` for SSL Staff ID: ${sslStaffId}` : ''}${status ? ` with status: ${status}` : ''}`,
      );

      const pageNum = parseInt(page, 10);
      const pageSizeNum = parseInt(pageSize, 10);
      const skip = (pageNum - 1) * pageSizeNum;

      const where: any = {};

      if (sslStaffId) {
        where.sslStaffId = sslStaffId; // Remove parseInt, use string directly
      }

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(startDate);
        }
        if (endDate) {
          where.date.lte = new Date(endDate);
        }
      }

      const [data, totalItems] = await Promise.all([
        this.prisma.dailyWorkPlan.findMany({
          where,
          skip,
          take: pageSizeNum,
          include: {
            sslStaff: {
              select: {
                id: true,
                name: true,
                email: true,
                sslId: true,
                borrowerId: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            lastUpdatedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        }),
        this.prisma.dailyWorkPlan.count({ where }),
      ]);

      const totalPages = Math.ceil(totalItems / pageSizeNum);

      return this.commonFunctions.returnFormattedResponse(
        200,
        `Found ${data.length} daily work plan(s)`,
        {
          data,
          pagination: {
            currentPage: pageNum,
            pageSize: pageSizeNum,
            totalItems,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1,
          },
        },
      );
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching daily work plans: ${apiError.message}`);
      this.logger.error(`Full error: ${JSON.stringify(error)}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Get('staff/:sslStaffId')
  async getDailyWorkPlansByStaff(@Param('sslStaffId') sslStaffId: string) {
    try {
      this.logger.debug(
        `Fetching daily work plans for SSL Staff ID: ${sslStaffId}`,
      );

      // Check if SSL Staff exists
      const sslStaff = await this.prisma.sslStaff.findUnique({
        where: { id: sslStaffId },
      });

      if (!sslStaff) {
        return {
          success: false,
          error: 'SSL Staff not found',
        };
      }

      const records = await this.prisma.dailyWorkPlan.findMany({
        where: { sslStaffId },
        include: {
          sslStaff: {
            select: {
              id: true,
              name: true,
              email: true,
              sslId: true,
              borrowerId: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          lastUpdatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      return {
        success: true,
        data: records,
        message: `Found ${records.length} daily work plan(s) for ${sslStaff.name}`,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching daily work plans by staff: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  // @Get(':id')
  // async getDailyWorkPlanById(@Param('id') id: string) {
  //   try {
  //     this.logger.debug(`Fetching daily work plan with ID: ${id}`);

  //     const idNum = parseInt(id, 10);
  //     if (isNaN(idNum)) {
  //       return {
  //         success: false,
  //         error: 'Invalid ID format. ID must be a number.',
  //       };
  //     }

  //     const record = await this.prisma.dailyWorkPlan.findUnique({
  //       where: { id: idNum },
  //       include: {
  //         sslStaff: {
  //           select: {
  //             id: true,
  //             name: true,
  //             email: true,
  //             sslId: true,
  //             borrowerId: true,
  //           },
  //         },
  //         createdBy: {
  //           select: {
  //             id: true,
  //             name: true,
  //             email: true,
  //           },
  //         },
  //         lastUpdatedBy: {
  //           select: {
  //             id: true,
  //             name: true,
  //             email: true,
  //           },
  //         },
  //       },
  //     });

  //     if (!record) {
  //       return {
  //         success: false,
  //         error: 'Daily work plan not found',
  //       };
  //     }

  //     return {
  //       success: true,
  //       data: record,
  //     };
  //   } catch (error: unknown) {
  //     const apiError = error as ApiError;
  //     this.logger.error(`Error fetching daily work plan: ${apiError.message}`);
  //     return {
  //       success: false,
  //       error: apiError.message || 'An unknown error occurred',
  //     };
  //   }
  // }

  @Post()
  async createDailyWorkPlan(
    @Body()
    createDto: {
      date: string;
      plannedVisit: string;
      actualGpsCoordinates?: string;
      callsMadeDescription: string;
      notes?: string;
      supervisorReview?: string;
      status?: string;
      sslStaffId: string; // Changed from number to string
    },
  ) {
    try {
      this.logger.debug('Creating new daily work plan', createDto);

      // Validate SSL Staff
      const sslStaff = await this.prisma.sslStaff.findUnique({
        where: { id: createDto.sslStaffId },
      });

      if (!sslStaff) {
        return {
          success: false,
          error: 'SSL Staff not found',
        };
      }

      // TODO: Get the actual user ID from the authenticated session
      const createdById = 1; // This should come from the authenticated user

      const newRecord = await this.prisma.dailyWorkPlan.create({
        data: {
          date: new Date(createDto.date),
          plannedVisit: createDto.plannedVisit,
          actualGpsCoordinates: createDto.actualGpsCoordinates || null,
          callsMadeDescription: createDto.callsMadeDescription,
          notes: createDto.notes || null,
          supervisorReview: createDto.supervisorReview || null,
          status: createDto.status || 'Pending',
          sslStaffId: createDto.sslStaffId,
          createdById,
        },
        include: {
          sslStaff: {
            select: {
              id: true,
              name: true,
              email: true,
              sslId: true,
              borrowerId: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Daily work plan created successfully',
        data: newRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error creating daily work plan: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Put(':id')
  async updateDailyWorkPlan(
    @Param('id') id: string,
    @Body()
    updateDto: {
      date?: string;
      plannedVisit?: string;
      actualGpsCoordinates?: string;
      callsMadeDescription?: string;
      notes?: string;
      supervisorReview?: string;
      status?: string;
      sslStaffId?: string; // Changed from number to string
    },
  ) {
    try {
      this.logger.debug(`Updating daily work plan with ID: ${id}`, updateDto);

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return {
          success: false,
          error: 'Invalid ID format. ID must be a number.',
        };
      }

      // Check if record exists
      const existingRecord = await this.prisma.dailyWorkPlan.findUnique({
        where: { id: idNum },
      });

      if (!existingRecord) {
        return {
          success: false,
          error: 'Daily work plan not found',
        };
      }

      // Validate SSL Staff if being updated
      if (updateDto.sslStaffId) {
        const sslStaff = await this.prisma.sslStaff.findUnique({
          where: { id: updateDto.sslStaffId },
        });

        if (!sslStaff) {
          return {
            success: false,
            error: 'SSL Staff not found',
          };
        }
      }

      // TODO: Get the actual user ID from the authenticated session
      const lastUpdatedById = 1; // This should come from the authenticated user

      const updateData: any = { ...updateDto };
      if (updateDto.date) {
        updateData.date = new Date(updateDto.date);
      }
      updateData.lastUpdatedById = lastUpdatedById;

      const updatedRecord = await this.prisma.dailyWorkPlan.update({
        where: { id: idNum },
        data: updateData,
        include: {
          sslStaff: {
            select: {
              id: true,
              name: true,
              email: true,
              sslId: true,
              borrowerId: true,
            },
          },
          lastUpdatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Daily work plan updated successfully',
        data: updatedRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating daily work plan: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Delete(':id')
  async deleteDailyWorkPlan(@Param('id') id: string) {
    try {
      this.logger.debug(`Deleting daily work plan with ID: ${id}`);

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return {
          success: false,
          error: 'Invalid ID format. ID must be a number.',
        };
      }

      // Check if record exists
      const existingRecord = await this.prisma.dailyWorkPlan.findUnique({
        where: { id: idNum },
      });

      if (!existingRecord) {
        return {
          success: false,
          error: 'Daily work plan not found',
        };
      }

      await this.prisma.dailyWorkPlan.delete({
        where: { id: idNum },
      });

      return {
        success: true,
        message: 'Daily work plan deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error deleting daily work plan: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
