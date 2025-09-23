import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateJoinUpskillDto } from '../dto/create-join-upskill.dto';
import { UpdateJoinUpskillDto } from '../dto/update-join-upskill.dto';

@Injectable()
export class JoinUpskillService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateJoinUpskillDto) {
    const data = {
      teacherName: dto.teacherName,
      schoolName: dto.schoolName,
      teachingLevel: dto.teachingLevel,
      numberOfLearners: dto.numberOfLearners,
      yearsOfExperience: dto.yearsOfExperience,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      type: dto.type ?? null,
      platform: dto.platform ?? null,
    };

    return this.prisma.joinUpskillApplication.create({ data });
  }

  async findAll() {
    return this.prisma.joinUpskillApplication.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const item = await this.prisma.joinUpskillApplication.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('JoinUpskillApplication not found');
    return item;
  }

  async update(id: string, dto: UpdateJoinUpskillDto) {
    // allow partial updates
    await this.findOne(id);
    const data: any = {};
    if (dto.teacherName !== undefined) data.teacherName = dto.teacherName;
    if (dto.schoolName !== undefined) data.schoolName = dto.schoolName;
    if (dto.teachingLevel !== undefined) data.teachingLevel = dto.teachingLevel;
    if (dto.numberOfLearners !== undefined) data.numberOfLearners = dto.numberOfLearners;
    if (dto.yearsOfExperience !== undefined) data.yearsOfExperience = dto.yearsOfExperience;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.platform !== undefined) data.platform = dto.platform;

    return this.prisma.joinUpskillApplication.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.joinUpskillApplication.delete({ where: { id } });
  }
}
