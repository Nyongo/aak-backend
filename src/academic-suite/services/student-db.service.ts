import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto } from '../dto/create-student.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StudentDbService {
  private readonly logger = new Logger(StudentDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateStudentDto) {
    this.logger.log(`Creating new student: ${data.name}`);
    const student = await this.prisma.student.create({
      data: {
        id: uuidv4(),
        name: data.name,
        admissionNumber: data.admissionNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        status: data.status ?? 'Active',
        specialNeeds: data.specialNeeds ?? [],
        medicalInfo: data.medicalInfo,
        photo: data.photo,
        isActive: data.isActive ?? true,
        schoolId: data.schoolId,
        parentId: data.parentId,
      },
      include: {
        school: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, parentType: true } },
      },
    });
    return student;
  }

  async findAll(page = 1, pageSize = 10, schoolId?: string, parentId?: string) {
    this.logger.debug(`Listing students page=${page} size=${pageSize} schoolId=${schoolId} parentId=${parentId}`);
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (parentId) where.parentId = parentId;

    const [students, totalItems] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          school: { select: { id: true, name: true } },
          parent: { select: { id: true, name: true, parentType: true } },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);
    return { data: students, pagination: { page, pageSize, totalItems, totalPages } };
  }

  async findById(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, parentType: true } },
      },
    });
  }

  async update(id: string, data: UpdateStudentDto) {
    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        name: data.name,
        admissionNumber: data.admissionNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        status: data.status,
        specialNeeds: data.specialNeeds,
        medicalInfo: data.medicalInfo,
        photo: data.photo,
        isActive: data.isActive,
        schoolId: data.schoolId,
        parentId: data.parentId,
      },
      include: {
        school: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, parentType: true } },
      },
    });
    return updated;
  }

  async delete(id: string) {
    return this.prisma.student.delete({ where: { id } });
  }

  async getStatistics() {
    const [total, active, inactive] = await Promise.all([
      this.prisma.student.count(),
      this.prisma.student.count({ where: { isActive: true } }),
      this.prisma.student.count({ where: { isActive: false } }),
    ]);
    return { total, active, inactive };
  }
}
