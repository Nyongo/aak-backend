import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDriverDto, UpdateDriverDto } from '../dto/create-driver.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DriverDbService {
  private readonly logger = new Logger(DriverDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDriverDto) {
    this.logger.log(`Creating new driver: ${data.name}`);
    
    // Generate a 4-digit PIN if not provided
    const pin = data.pin || this.generatePin();
    
    const driver = await this.prisma.schoolDriver.create({
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
    
    this.logger.log(`Driver created successfully with ID: ${driver.id}`);
    return driver;
  }

  async findAll(page: number = 1, pageSize: number = 10, schoolId?: string) {
    this.logger.debug(
      `Finding all drivers with pagination (page: ${page}, pageSize: ${pageSize}) and schoolId: ${schoolId}`,
    );
    
    const skip = (page - 1) * pageSize;
    const where: any = {};
    
    if (schoolId) {
      where.schoolId = schoolId;
    }

    const [drivers, totalItems] = await Promise.all([
      this.prisma.schoolDriver.findMany({
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
      this.prisma.schoolDriver.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: drivers,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async findById(id: string) {
    this.logger.debug(`Finding driver by ID: ${id}`);
    return this.prisma.schoolDriver.findUnique({
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
    this.logger.debug(`Finding driver by PIN: ${pin}`);
    return this.prisma.schoolDriver.findUnique({
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

  async update(id: string, updateData: UpdateDriverDto) {
    this.logger.log(`Updating driver with ID: ${id}`, updateData);
    
    const driver = await this.prisma.schoolDriver.update({
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
    
    this.logger.log(`Driver updated successfully: ${driver.id}`);
    return driver;
  }

  async delete(id: string) {
    this.logger.log(`Deleting driver with ID: ${id}`);
    const driver = await this.prisma.schoolDriver.delete({
      where: { id },
    });
    this.logger.log(`Driver deleted successfully: ${driver.id}`);
    return driver;
  }

  async getDriverStatistics() {
    this.logger.debug('Getting driver statistics');
    
    const [total, active, inactive] = await Promise.all([
      this.prisma.schoolDriver.count(),
      this.prisma.schoolDriver.count({ where: { isActive: true } }),
      this.prisma.schoolDriver.count({ where: { isActive: false } }),
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
