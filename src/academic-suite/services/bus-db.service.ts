import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusDto, UpdateBusDto } from '../dto/create-bus.dto';
import * as crypto from 'crypto';

@Injectable()
export class BusDbService {
  private readonly logger = new Logger(BusDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBusDto) {
    const bus = await this.prisma.bus.create({
      data: {
        id: crypto.randomUUID(),
        registrationNumber: data.registrationNumber,
        schoolId: data.schoolId,
        make: data.make,
        model: data.model,
        seatsCapacity: data.seatsCapacity,
        type: data.type,
        status: data.status || 'Active',
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
      },
    });
    return bus;
  }

  async findAll(page: number = 1, pageSize: number = 10, schoolId?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    
    const [data, totalItems] = await Promise.all([
      this.prisma.bus.findMany({
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
        },
      }),
      this.prisma.bus.count({ where }),
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
    return this.prisma.bus.findUnique({
      where: { id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            customerId: true,
          },
        },
      },
    });
  }

  async findByRegistrationNumber(registrationNumber: string) {
    return this.prisma.bus.findUnique({
      where: { registrationNumber },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            customerId: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateBusDto) {
    const updated = await this.prisma.bus.update({
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
      },
    });
    return updated;
  }

  async delete(id: string) {
    return this.prisma.bus.delete({ where: { id } });
  }

  async getBusStatistics() {
    const [total, active, inactive] = await Promise.all([
      this.prisma.bus.count(),
      this.prisma.bus.count({ where: { isActive: true } }),
      this.prisma.bus.count({ where: { isActive: false } }),
    ]);

    const totalSeats = await this.prisma.bus.aggregate({
      _sum: { seatsCapacity: true },
    });

    return {
      total,
      active,
      inactive,
      totalSeats: totalSeats._sum.seatsCapacity || 0,
    };
  }
}
