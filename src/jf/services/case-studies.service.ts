import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CaseStudy } from '../interfaces/case-study.interface';
import { CreateCaseStudyDto } from '../dto/create-case-study.dto';
import { UpdateCaseStudyDto } from '../dto/update-case-study.dto';

@Injectable()
export class CaseStudiesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCaseStudyDto): Promise<CaseStudy> {
    return this.prisma.caseStudy.create({
      data: { slug: dto.slug },
    }) as Promise<CaseStudy>;
  }

  findAll(): Promise<CaseStudy[]> {
    return this.prisma.caseStudy.findMany({
      orderBy: { createdAt: 'desc' },
    }) as Promise<CaseStudy[]>;
  }

  async findOne(id: string): Promise<CaseStudy> {
    const cs = await this.prisma.caseStudy.findUnique({ where: { id } });
    if (!cs) throw new NotFoundException(`CaseStudy ${id} not found`);
    return cs as CaseStudy;
  }

  update(id: string, dto: UpdateCaseStudyDto): Promise<CaseStudy> {
    return this.prisma.caseStudy.update({
      where: { id },
      data: { slug: dto.slug },
    }) as Promise<CaseStudy>;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.caseStudy.delete({ where: { id } });
  }
}
