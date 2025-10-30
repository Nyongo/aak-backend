import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSchoolDto, UpdateSchoolDto } from '../dto/create-school.dto';
import * as crypto from 'crypto';

@Injectable()
export class SchoolDbService {
  private readonly logger = new Logger(SchoolDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSchoolDto & { logo?: string }) {
    const school = await this.prisma.school.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name,
        url: data.url || null,
        address: data.address || null,
        longitude: data.longitude || null,
        latitude: data.latitude || null,
        principalName: data.principalName || null,
        principalEmail: data.principalEmail || null,
        principalPhone: data.principalPhone || null,
        phoneNumber: data.phoneNumber || null,
        email: data.email || null,
        customerId: data.customerId,
        isActive: data.isActive ?? true,
        logo: data.logo || null,
        schoolId: `SCH-${Date.now()}`,
      },
    });
    return school;
  }

  async findAll(page: number = 1, pageSize: number = 10, customerId?: number) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    const [data, totalItems] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.school.count({ where }),
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
    return this.prisma.school.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateSchoolDto & { logo?: string }) {
    const updated = await this.prisma.school.update({
      where: { id },
      data: { ...data },
    });
    return updated;
  }

  async delete(id: string) {
    return this.prisma.school.delete({ where: { id } });
  }
}
