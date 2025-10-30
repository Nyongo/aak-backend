import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateParentDto, UpdateParentDto } from '../dto/create-parent.dto';

@Injectable()
export class ParentDbService {
  private readonly logger = new Logger(ParentDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateParentDto) {
    this.logger.log(`Creating new parent: ${data.name}`);
    const parent = await this.prisma.schoolParent.create({
      data: {
        name: data.name,
        parentType: data.parentType,
        phoneNumber: data.phoneNumber,
        email: data.email,
        status: data.status ?? 'Active',
        isActive: data.isActive ?? true,
        schoolId: data.schoolId,
      },
      include: {
        school: { select: { id: true, name: true, customerId: true } },
      },
    });
    return parent;
  }

  async findAll(page = 1, pageSize = 10, schoolId?: string) {
    this.logger.debug(
      `Finding all parents with pagination (page: ${page}, pageSize: ${pageSize}) and schoolId: ${schoolId}`,
    );
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;

    const [parents, totalItems] = await Promise.all([
      this.prisma.schoolParent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { school: { select: { id: true, name: true, customerId: true } } },
      }),
      this.prisma.schoolParent.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);
    return { data: parents, pagination: { page, pageSize, totalItems, totalPages } };
  }

  async findById(id: string) {
    return this.prisma.schoolParent.findUnique({
      where: { id },
      include: { school: { select: { id: true, name: true, customerId: true } } },
    });
  }

  async update(id: string, data: UpdateParentDto) {
    const updated = await this.prisma.schoolParent.update({
      where: { id },
      data: {
        name: data.name,
        parentType: data.parentType,
        phoneNumber: data.phoneNumber,
        email: data.email,
        status: data.status,
        isActive: data.isActive,
        schoolId: data.schoolId,
      },
      include: { school: { select: { id: true, name: true, customerId: true } } },
    });
    return updated;
  }

  async delete(id: string) {
    return this.prisma.schoolParent.delete({ where: { id } });
  }

  async getStatistics() {
    const [total, active, inactive] = await Promise.all([
      this.prisma.schoolParent.count(),
      this.prisma.schoolParent.count({ where: { isActive: true } }),
      this.prisma.schoolParent.count({ where: { isActive: false } }),
    ]);
    return { total, active, inactive };
  }
}
