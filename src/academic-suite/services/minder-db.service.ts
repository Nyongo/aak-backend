import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMinderDto, UpdateMinderDto } from '../dto/create-minder.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinderDbService {
  private readonly logger = new Logger(MinderDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMinderDto) {
    this.logger.log(`Creating new minder: ${data.name}`);

    // Generate a 4-digit PIN if not provided
    const pin = data.pin || this.generatePin();

    const minder = await this.prisma.schoolMinder.create({
      data: {
        id: uuidv4(),
        name: data.name,
        phoneNumber: data.phoneNumber,
        schoolId: data.schoolId,
        photo: data.photo,
        pin: pin,
        status: data.status || 'Active',
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
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

    this.logger.log(`Minder created successfully with ID: ${minder.id}`);
    return minder;
  }

  async findAll(page: number = 1, pageSize: number = 10, schoolId?: string) {
    this.logger.debug(
      `Finding all minders with pagination (page: ${page}, pageSize: ${pageSize}) and schoolId: ${schoolId}`,
    );

    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (schoolId) {
      where.schoolId = schoolId;
    }

    const [minders, totalItems] = await Promise.all([
      this.prisma.schoolMinder.findMany({
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
      this.prisma.schoolMinder.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: minders,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async findById(id: string) {
    this.logger.debug(`Finding minder by ID: ${id}`);
    return this.prisma.schoolMinder.findUnique({
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

  async findByPin(pin: string) {
    this.logger.debug(`Finding minder by PIN: ${pin}`);
    return this.prisma.schoolMinder.findUnique({
      where: { pin },
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

  async update(id: string, updateData: UpdateMinderDto) {
    this.logger.log(`Updating minder with ID: ${id}`, updateData);

    const minder = await this.prisma.schoolMinder.update({
      where: { id },
      data: {
        name: updateData.name,
        phoneNumber: updateData.phoneNumber,
        schoolId: updateData.schoolId,
        photo: updateData.photo,
        pin: updateData.pin,
        status: updateData.status,
        isActive: updateData.isActive,
        updatedAt: new Date(),
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

    this.logger.log(`Minder updated successfully: ${minder.id}`);
    return minder;
  }

  async delete(id: string) {
    this.logger.log(`Deleting minder with ID: ${id}`);
    const minder = await this.prisma.schoolMinder.delete({
      where: { id },
    });
    this.logger.log(`Minder deleted successfully: ${minder.id}`);
    return minder;
  }

  async getMinderStatistics() {
    this.logger.debug('Getting minder statistics');

    const [total, active, inactive] = await Promise.all([
      this.prisma.schoolMinder.count(),
      this.prisma.schoolMinder.count({ where: { isActive: true } }),
      this.prisma.schoolMinder.count({ where: { isActive: false } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }

  private generatePin(): string {
    // Generate a random 4-digit PIN
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
