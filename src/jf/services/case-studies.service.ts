import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CaseStudy } from '../interfaces/case-study.interface';
import { CreateCaseStudyDto } from '../dto/create-case-study.dto';
import { UpdateCaseStudyDto } from '../dto/update-case-study.dto';
import { CtaDto } from '../dto/cta.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CaseStudiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCaseStudyDto & { bannerFile?: Express.Multer.File }): Promise<CaseStudy> {
    const { bannerFile, ...dto } = input;
    return this.prisma.caseStudy.create({
      data: {
        link: dto.link,
        order: dto.order,
        title: dto.title,
        description: dto.description,
        stats: dto.stats as Prisma.JsonValue,
        isActive: dto.isActive,
        bannerMime: bannerFile?.mimetype,
        bannerBlob: bannerFile?.buffer,
      },
    });
  }

  async findAll(page: number, size: number): Promise<{ items: CaseStudy[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.caseStudy.findMany({
        skip: (page - 1) * size,
        take: size,
        orderBy: { order: 'asc' },
      }),
      this.prisma.caseStudy.count(),
    ]);
    return { items, total };
  }

  async findOne(id: string): Promise<CaseStudy> {
    const cs = await this.prisma.caseStudy.findUnique({ where: { id } });
    if (!cs) throw new NotFoundException(`CaseStudy ${id} not found`);
    return cs;
  }

  async update(
    id: string,
    input: UpdateCaseStudyDto & { bannerFile?: Express.Multer.File }
  ): Promise<CaseStudy> {
    const existing = await this.prisma.caseStudy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`CaseStudy ${id} not found`);

    const { bannerFile, ...dto } = input;
    return this.prisma.caseStudy.update({
      where: { id },
      data: {
        ...dto,
        stats: dto.stats ? (dto.stats as Prisma.JsonValue) : undefined,
        bannerMime: bannerFile?.mimetype,
        bannerBlob: bannerFile?.buffer,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.caseStudy.delete({ where: { id } });
  }

  async saveCta(caseStudyId: string, cta: CtaDto): Promise<void> {
    await this.prisma.caseStudyCta.upsert({
      where: { caseStudyId },
      create: { caseStudyId, ...cta },
      update: { ...cta },
    });
  }
}
