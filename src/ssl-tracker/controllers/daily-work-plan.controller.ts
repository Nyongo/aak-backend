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
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    console.log('+++++++==', 'Here');
    try {
      this.logger.debug(
        `Fetching daily work plans${sslStaffId ? ` for SSL Staff ID: ${sslStaffId}` : ''}${status ? ` with status: ${status}` : ''}`,
      );

      const where: any = {};

      if (sslStaffId) {
        where.sslStaffId = sslStaffId;
      }

      if (status) {
        where.status = status;
      }

      // Handle date filtering with multiple parameter naming conventions
      const effectiveStartDate = startDate || dateFrom;
      const effectiveEndDate = endDate || dateTo;

      if (effectiveStartDate || effectiveEndDate) {
        where.date = {};
        if (effectiveStartDate) {
          // Parse start date and set to beginning of day
          const startDateTime = new Date(effectiveStartDate);
          startDateTime.setHours(0, 0, 0, 0);
          where.date.gte = startDateTime;
        }
        if (effectiveEndDate) {
          // Parse end date and set to end of day
          const endDateTime = new Date(effectiveEndDate);
          endDateTime.setHours(23, 59, 59, 999);
          where.date.lte = endDateTime;
        }
      }

      const data = await this.prisma.dailyWorkPlan.findMany({
        where,
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
        },
        orderBy: {
          date: 'desc',
        },
      });

      const response = this.commonFunctions.returnFormattedResponse(
        200,
        `Found ${data.length} daily work plan(s)`,
        {
          data,
          totalItems: data.length,
        },
      );

      console.log(
        'Response being returned:',
        JSON.stringify(response, null, 2),
      );
      return response;
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
      schoolId?: string; // New field for school reference
      teamLeaderId?: string;
      schoolName?: string;
      region?: string;
      taskOfTheDay?: string;
      pinnedLocation?: string;
      locationIsVerified?: boolean;
      marketingOfficerComments?: string;
    },
  ) {
    try {
      this.logger.debug('Creating new daily work plan', createDto);

      // Validate SSL Staff and get team leader info
      const sslStaff = await this.prisma.sslStaff.findUnique({
        where: { id: createDto.sslStaffId },
      });

      if (!sslStaff) {
        return {
          success: false,
          error: 'SSL Staff not found',
        };
      }

      // Auto-populate teamLeaderId from sslStaff.teamLeader
      const teamLeaderId =
        createDto.teamLeaderId || sslStaff.teamLeader || null;

      // Auto-populate region from sslStaff.sslArea
      const region = createDto.region || sslStaff.sslArea || null;

      // Handle schoolId and auto-populate schoolName and actualGpsCoordinates
      let schoolName = createDto.schoolName || null;
      let actualGpsCoordinates = createDto.actualGpsCoordinates || null;
      let schoolId = createDto.schoolId || null;

      if (createDto.schoolId) {
        // Fetch school details
        const school = await this.prisma.school.findUnique({
          where: { id: createDto.schoolId },
        });

        if (school) {
          schoolName = school.name;
          actualGpsCoordinates = school.locationPin;
          schoolId = school.id;
        } else {
          return {
            success: false,
            error: 'School not found with the provided schoolId',
          };
        }
      }

      // TODO: Get the actual user ID from the authenticated session
      const createdById = 1; // This should come from the authenticated user

      const newRecord = await this.prisma.dailyWorkPlan.create({
        data: {
          date: new Date(createDto.date),
          plannedVisit: createDto.plannedVisit,
          actualGpsCoordinates: actualGpsCoordinates,
          callsMadeDescription: createDto.callsMadeDescription,
          notes: createDto.notes || null,
          supervisorReview: createDto.supervisorReview || null,
          status: createDto.status || 'Pending',
          sslStaffId: createDto.sslStaffId,
          schoolId: schoolId,
          teamLeaderId: teamLeaderId,
          schoolName: schoolName,
          region: region,
          taskOfTheDay: createDto.taskOfTheDay || null,
          pinnedLocation: createDto.pinnedLocation || null,
          locationIsVerified: createDto.locationIsVerified || false,
          marketingOfficerComments: createDto.marketingOfficerComments || null,
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
          school: {
            select: {
              id: true,
              name: true,
              schoolId: true,
              locationPin: true,
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
      schoolId?: string; // New field for school reference
      teamLeaderId?: string;
      schoolName?: string;
      region?: string;
      taskOfTheDay?: string;
      pinnedLocation?: string;
      locationIsVerified?: boolean;
      marketingOfficerComments?: string;
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

      // Validate SSL Staff if being updated and get team leader info
      let sslStaff = null;
      if (updateDto.sslStaffId) {
        sslStaff = await this.prisma.sslStaff.findUnique({
          where: { id: updateDto.sslStaffId },
        });

        if (!sslStaff) {
          return {
            success: false,
            error: 'SSL Staff not found',
          };
        }
      }

      // Handle schoolId and auto-populate schoolName and actualGpsCoordinates
      if (updateDto.schoolId) {
        const school = await this.prisma.school.findUnique({
          where: { id: updateDto.schoolId },
        });

        if (school) {
          updateDto.schoolName = school.name;
          updateDto.actualGpsCoordinates = school.locationPin;
        } else {
          return {
            success: false,
            error: 'School not found with the provided schoolId',
          };
        }
      }

      // TODO: Get the actual user ID from the authenticated session
      const lastUpdatedById = 1; // This should come from the authenticated user

      const updateData: any = { ...updateDto };
      if (updateDto.date) {
        updateData.date = new Date(updateDto.date);
      }

      // Auto-populate teamLeaderId and region if sslStaffId is being updated
      if (updateDto.sslStaffId && sslStaff) {
        updateData.teamLeaderId =
          updateDto.teamLeaderId || sslStaff.teamLeader || null;
        updateData.region = updateDto.region || sslStaff.sslArea || null;
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
          school: {
            select: {
              id: true,
              name: true,
              schoolId: true,
              locationPin: true,
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

  @Get('analytics/summary')
  async getWorkPlanAnalytics(
    @Query('sslStaffId') sslStaffId?: string,
    @Query('region') region?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('taskOfTheDay') taskOfTheDay?: string,
    @Query('teamLeaderId') teamLeaderId?: string,
  ) {
    try {
      this.logger.debug(
        `Fetching work plan analytics${sslStaffId ? ` for SSL Staff ID: ${sslStaffId}` : ''}${region ? ` in region: ${region}` : ''}${taskOfTheDay ? ` with task: ${taskOfTheDay}` : ''}${teamLeaderId ? ` for team leader: ${teamLeaderId}` : ''}`,
      );

      // Build where clause for filtering
      const where: any = {};

      if (sslStaffId) {
        where.sslStaffId = sslStaffId;
      }

      if (region) {
        where.region = region;
      }

      if (taskOfTheDay) {
        where.taskOfTheDay = {
          contains: taskOfTheDay,
          mode: 'insensitive', // Case-insensitive search
        };
      }

      if (teamLeaderId) {
        where.teamLeaderId = teamLeaderId;
      }

      // Handle date filtering with multiple parameter naming conventions
      const effectiveStartDate = startDate || dateFrom;
      const effectiveEndDate = endDate || dateTo;

      if (effectiveStartDate || effectiveEndDate) {
        where.date = {};
        if (effectiveStartDate) {
          // Parse start date and set to beginning of day
          const startDateTime = new Date(effectiveStartDate);
          startDateTime.setHours(0, 0, 0, 0);
          where.date.gte = startDateTime;
        }
        if (effectiveEndDate) {
          // Parse end date and set to end of day
          const endDateTime = new Date(effectiveEndDate);
          endDateTime.setHours(23, 59, 59, 999);
          where.date.lte = endDateTime;
        }
      }

      // Get total work plans count
      const totalWorkPlans = await this.prisma.dailyWorkPlan.count({
        where,
      });

      // Get completed work plans count
      const completedWorkPlans = await this.prisma.dailyWorkPlan.count({
        where: {
          ...where,
          status: 'Completed',
        },
      });

      // Get pending work plans count
      const pendingWorkPlans = await this.prisma.dailyWorkPlan.count({
        where: {
          ...where,
          status: 'Pending',
        },
      });

      // Get in-progress work plans count
      const inProgressWorkPlans = await this.prisma.dailyWorkPlan.count({
        where: {
          ...where,
          status: 'In Progress',
        },
      });

      // Get cancelled work plans count
      const cancelledWorkPlans = await this.prisma.dailyWorkPlan.count({
        where: {
          ...where,
          status: 'Cancelled',
        },
      });

      // Calculate completion rate
      const completionRate =
        totalWorkPlans > 0 ? (completedWorkPlans / totalWorkPlans) * 100 : 0;

      // Calculate current week performance
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
      endOfWeek.setHours(23, 59, 59, 999);

      // Get current week work plans
      const currentWeekWorkPlans = await this.prisma.dailyWorkPlan.count({
        where: {
          ...where,
          date: {
            gte: startOfWeek,
            lte: endOfWeek,
          },
        },
      });

      // Get current week completed work plans
      const currentWeekCompletedWorkPlans =
        await this.prisma.dailyWorkPlan.count({
          where: {
            ...where,
            status: 'Completed',
            date: {
              gte: startOfWeek,
              lte: endOfWeek,
            },
          },
        });

      // Calculate current week completion rate
      const currentWeekCompletionRate =
        currentWeekWorkPlans > 0
          ? (currentWeekCompletedWorkPlans / currentWeekWorkPlans) * 100
          : 0;

      // Get recent work plans for additional context
      const recentWorkPlans = await this.prisma.dailyWorkPlan.findMany({
        where,
        include: {
          sslStaff: {
            select: {
              id: true,
              name: true,
              sslId: true,
            },
          },
          school: {
            select: {
              id: true,
              name: true,
              schoolId: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        take: 5, // Get last 5 work plans
      });

      // Get all work plans with applied filters
      const allWorkPlans = await this.prisma.dailyWorkPlan.findMany({
        where,
        include: {
          sslStaff: {
            select: {
              id: true,
              name: true,
              sslId: true,
              email: true,
              phoneNumber: true,
            },
          },
          school: {
            select: {
              id: true,
              name: true,
              schoolId: true,
              locationPin: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      // Get all SSL staff (type=SSL) first
      const allSslStaff = await this.prisma.sslStaff.findMany({
        where: {
          type: 'SSL',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          sslId: true,
          email: true,
          sslArea: true, // Region
          teamLeader: true, // Team Leader ID
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Calculate SSL compliance metrics for each SSL staff
      const sslCompliance = await Promise.all(
        allSslStaff.map(async (sslStaff) => {
          // Get total planned visits for this SSL staff (with filters)
          const totalPlannedVisits = await this.prisma.dailyWorkPlan.count({
            where: {
              ...where,
              sslStaffId: sslStaff.id,
            },
          });

          // Get completed visits for this SSL staff (with filters)
          const completedVisits = await this.prisma.dailyWorkPlan.count({
            where: {
              ...where,
              sslStaffId: sslStaff.id,
              status: 'Completed',
            },
          });

          // Calculate compliance percentage - set to 0 if no work plans
          const compliancePercentage =
            totalPlannedVisits > 0
              ? (completedVisits / totalPlannedVisits) * 100
              : 0;

          // Get team leader name if teamLeader ID exists
          let teamLeaderName = null;
          if (sslStaff.teamLeader) {
            const teamLeader = await this.prisma.sslStaff.findUnique({
              where: { id: sslStaff.teamLeader },
              select: { name: true },
            });
            teamLeaderName = teamLeader?.name || null;
          }

          return {
            sslStaffId: sslStaff.id,
            sslName: sslStaff.name,
            sslId: sslStaff.sslId,
            email: sslStaff.email,
            region: sslStaff.sslArea || null,
            teamLeaderId: sslStaff.teamLeader || null,
            teamLeaderName: teamLeaderName,
            plannedVisits: totalPlannedVisits,
            completedVisits: completedVisits,
            compliancePercentage: Math.round(compliancePercentage * 100) / 100,
          };
        }),
      );

      // Sort by compliance percentage (descending) and then by name (ascending) for same compliance
      const sortedSslCompliance = sslCompliance.sort((a, b) => {
        if (b.compliancePercentage !== a.compliancePercentage) {
          return b.compliancePercentage - a.compliancePercentage;
        }
        return a.sslName.localeCompare(b.sslName);
      });

      // Calculate average compliance
      const averageCompliance =
        sslCompliance.length > 0
          ? Math.round(
              (sslCompliance.reduce(
                (sum, item) => sum + item.compliancePercentage,
                0,
              ) /
                sslCompliance.length) *
                100,
            ) / 100
          : 0;

      const sslComplianceResult = {
        data: sortedSslCompliance,
        totalSslStaff: sslCompliance.length,
        averageCompliance,
      };

      const analytics = {
        summary: {
          totalWorkPlans,
          completedWorkPlans,
          pendingWorkPlans,
          inProgressWorkPlans,
          cancelledWorkPlans,
          completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
        },
        currentWeek: {
          totalWeek: currentWeekWorkPlans,
          completedWeek: currentWeekCompletedWorkPlans,
          completionRate: Math.round(currentWeekCompletionRate * 100) / 100,
          weekStart: startOfWeek.toISOString(),
          weekEnd: endOfWeek.toISOString(),
        },
        sslCompliance: sslComplianceResult,
        filters: {
          sslStaffId,
          region,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          taskOfTheDay,
          teamLeaderId,
        },
        recentWorkPlans,
        allWorkPlans: {
          data: allWorkPlans,
          totalCount: allWorkPlans.length,
        },
        generatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        message: 'Work plan analytics retrieved successfully',
        data: analytics,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching work plan analytics: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}
