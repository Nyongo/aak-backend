import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRouteDto,
  UpdateRouteDto,
  AddRouteStudentDto,
  BulkAddRouteStudentsDto,
  BulkRemoveRouteStudentsDto,
  RiderType,
} from '../dto/create-route.dto';
import * as crypto from 'crypto';

@Injectable()
export class RouteDbService {
  private readonly logger = new Logger(RouteDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRouteDto) {
    const route = await this.prisma.route.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name,
        schoolId: data.schoolId,
        tripType: data.tripType,
        description: data.description,
        status: data.status || 'Active',
        busId: data.busId,
        isActive: data.isActive ?? true,
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            customerId: true,
          },
        },
        bus: {
          select: {
            id: true,
            registrationNumber: true,
            make: true,
            model: true,
          },
        },
        routeStudents: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                admissionNumber: true,
              },
            },
          },
        },
      },
    });
    return route;
  }

  async findAll(page: number = 1, pageSize: number = 10, schoolId?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;

    const [data, totalItems] = await Promise.all([
      this.prisma.route.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          school: {
            select: {
              id: true,
              name: true,
              customerId: true,
            },
          },
          bus: {
            select: {
              id: true,
              registrationNumber: true,
              make: true,
              model: true,
            },
          },
          routeStudents: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  admissionNumber: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.route.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async findById(id: string) {
    return this.prisma.route.findUnique({
      where: { id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            customerId: true,
          },
        },
        bus: {
          select: {
            id: true,
            registrationNumber: true,
            make: true,
            model: true,
          },
        },
        routeStudents: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                admissionNumber: true,
                gender: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findByName(name: string, schoolId: string) {
    return this.prisma.route.findFirst({
      where: {
        name,
        schoolId,
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            customerId: true,
          },
        },
        bus: {
          select: {
            id: true,
            registrationNumber: true,
            make: true,
            model: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateRouteDto) {
    const updated = await this.prisma.route.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            customerId: true,
          },
        },
        bus: {
          select: {
            id: true,
            registrationNumber: true,
            make: true,
            model: true,
          },
        },
        routeStudents: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                admissionNumber: true,
              },
            },
          },
        },
      },
    });
    return updated;
  }

  async delete(id: string) {
    return this.prisma.route.delete({ where: { id } });
  }

  async addStudent(routeId: string, data: AddRouteStudentDto) {
    // Check if student is already on this route
    const existingRouteStudent = await this.prisma.routeStudent.findFirst({
      where: {
        routeId,
        studentId: data.studentId,
      },
    });

    if (existingRouteStudent) {
      throw new Error('Student is already assigned to this route');
    }

    const routeStudent = await this.prisma.routeStudent.create({
      data: {
        id: crypto.randomUUID(),
        routeId,
        studentId: data.studentId,
        riderType: data.riderType || RiderType.DAILY,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            gender: true,
          },
        },
      },
    });

    return routeStudent;
  }

  async removeStudent(routeId: string, studentId: string) {
    return this.prisma.routeStudent.deleteMany({
      where: {
        routeId,
        studentId,
      },
    });
  }

  async getRouteStatistics() {
    const [total, active, inactive] = await Promise.all([
      this.prisma.route.count(),
      this.prisma.route.count({ where: { isActive: true } }),
      this.prisma.route.count({ where: { isActive: false } }),
    ]);

    const [totalStudents, dailyRiders, occasionalRiders] = await Promise.all([
      this.prisma.routeStudent.count(),
      this.prisma.routeStudent.count({ where: { riderType: 'DAILY' } }),
      this.prisma.routeStudent.count({ where: { riderType: 'OCCASIONAL' } }),
    ]);

    const routesByTripType = await this.prisma.route.groupBy({
      by: ['tripType'],
      _count: {
        id: true,
      },
    });

    return {
      total,
      active,
      inactive,
      totalStudents,
      dailyRiders,
      occasionalRiders,
      routesByTripType: routesByTripType.reduce(
        (acc, item) => {
          acc[item.tripType] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async getRouteStudents(routeId: string, riderType?: RiderType) {
    const where: any = { routeId };
    if (riderType) where.riderType = riderType;

    return this.prisma.routeStudent.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            gender: true,
            parent: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async bulkAddStudents(routeId: string, data: BulkAddRouteStudentsDto) {
    const results = {
      successful: [],
      failed: [],
      totalRequested: data.students.length,
    };

    // Check for existing assignments in batch
    const existingAssignments = await this.prisma.routeStudent.findMany({
      where: {
        routeId,
        studentId: {
          in: data.students.map((s) => s.studentId),
        },
      },
      select: {
        studentId: true,
      },
    });

    const existingStudentIds = new Set(
      existingAssignments.map((a) => a.studentId),
    );

    // Prepare data for bulk insert
    const studentsToAdd = data.students.filter((student) => {
      if (existingStudentIds.has(student.studentId)) {
        results.failed.push({
          studentId: student.studentId,
          error: 'Student is already assigned to this route',
        });
        return false;
      }
      return true;
    });

    if (studentsToAdd.length > 0) {
      try {
        // Bulk insert new route-student relationships
        const createData = studentsToAdd.map((student) => ({
          id: crypto.randomUUID(),
          routeId,
          studentId: student.studentId,
          riderType: student.riderType || RiderType.DAILY,
        }));

        await this.prisma.routeStudent.createMany({
          data: createData,
        });

        // Fetch the created records with student details
        const createdRecords = await this.prisma.routeStudent.findMany({
          where: {
            routeId,
            studentId: {
              in: studentsToAdd.map((s) => s.studentId),
            },
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                admissionNumber: true,
                gender: true,
              },
            },
          },
        });

        results.successful = createdRecords;
      } catch (error) {
        // Handle foreign key constraint violations and other errors
        for (const student of studentsToAdd) {
          results.failed.push({
            studentId: student.studentId,
            error:
              error instanceof Error ? error.message : 'Failed to add student',
          });
        }
      }
    }

    return {
      ...results,
      totalSuccessful: results.successful.length,
      totalFailed: results.failed.length,
    };
  }

  async bulkRemoveStudents(routeId: string, data: BulkRemoveRouteStudentsDto) {
    const results = {
      successful: [],
      failed: [],
      totalRequested: data.studentIds.length,
    };

    // Check which students are actually assigned to this route
    const existingAssignments = await this.prisma.routeStudent.findMany({
      where: {
        routeId,
        studentId: {
          in: data.studentIds,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionNumber: true,
            gender: true,
          },
        },
      },
    });

    const existingStudentIds = new Set(
      existingAssignments.map((a) => a.studentId),
    );

    // Identify students not assigned to this route
    data.studentIds.forEach((studentId) => {
      if (!existingStudentIds.has(studentId)) {
        results.failed.push({
          studentId,
          error: 'Student is not assigned to this route',
        });
      }
    });

    // Remove existing assignments
    if (existingAssignments.length > 0) {
      try {
        const deleteResult = await this.prisma.routeStudent.deleteMany({
          where: {
            routeId,
            studentId: {
              in: existingAssignments.map((a) => a.studentId),
            },
          },
        });

        // Mark successful removals
        results.successful = existingAssignments.map((assignment) => ({
          studentId: assignment.studentId,
          student: assignment.student,
          removed: true,
        }));

        this.logger.log(
          `Bulk removed ${deleteResult.count} students from route ${routeId}`,
        );
      } catch (error) {
        // If bulk delete fails, try individual deletes
        for (const assignment of existingAssignments) {
          try {
            await this.prisma.routeStudent.deleteMany({
              where: {
                routeId,
                studentId: assignment.studentId,
              },
            });
            results.successful.push({
              studentId: assignment.studentId,
              student: assignment.student,
              removed: true,
            });
          } catch (individualError) {
            results.failed.push({
              studentId: assignment.studentId,
              error:
                individualError instanceof Error
                  ? individualError.message
                  : 'Failed to remove student',
            });
          }
        }
      }
    }

    return {
      ...results,
      totalSuccessful: results.successful.length,
      totalFailed: results.failed.length,
    };
  }
}
