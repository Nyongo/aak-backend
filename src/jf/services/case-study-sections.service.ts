import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCaseStudySectionDto } from '../dto/create-case-study-section.dto';
import { UpdateCaseStudySectionDto } from '../dto/update-case-study-section.dto';
import { ReorderSectionsDto } from '../dto/reorder-sections.dto';
import {
  CaseStudySection,
  SectionMedia,
} from '../interfaces/case-study-section.interface';

@Injectable()
export class CaseStudySectionsService {
  private readonly logger = new Logger(CaseStudySectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(caseStudyId: string): Promise<CaseStudySection[]> {
    const raw = await this.prisma.caseStudySection.findMany({
      where: { caseStudyId },
      orderBy: { order: 'asc' },
      include: { media: true },
    });
    return raw.map(sec => this.map(sec));
  }

  async create(
    dto: CreateCaseStudySectionDto,
    files: Express.Multer.File[] = [],
  ): Promise<CaseStudySection> {
    const sec = await this.prisma.caseStudySection.create({
      data: {
        caseStudyId: dto.caseStudyId,
        order: dto.order,
        type: dto.type,
        isActive: dto.isActive,
        data: dto.data,
      },
    });

    if (files.length) {
      await Promise.all(files.map(f =>
        this.prisma.caseStudySectionMedia.create({
          data: {
            caseStudySectionId: sec.id,
            mimeType: f.mimetype,
            blob: f.buffer,
          },
        })
      ));
    }

    const fresh = await this.prisma.caseStudySection.findUnique({
      where: { id: sec.id },
      include: { media: true },
    });
    if (!fresh) throw new NotFoundException('Created section not found');
    return this.map(fresh);
  }

  async update(
    id: string,
    dto: UpdateCaseStudySectionDto,
    files: Express.Multer.File[] = [],
  ): Promise<CaseStudySection> {
    const existing = await this.prisma.caseStudySection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Section not found');

    await this.prisma.caseStudySection.update({
      where: { id },
      data: {
        order: dto.order   ?? existing.order,
        type: dto.type     ?? existing.type,
        isActive: dto.isActive ?? existing.isActive,
        data: dto.data     ?? existing.data,
      },
    });

    if (files.length) {
      await Promise.all(files.map(f =>
        this.prisma.caseStudySectionMedia.create({
          data: {
            caseStudySectionId: id,
            mimeType: f.mimetype,
            blob: f.buffer,
          },
        })
      ));
    }

    const fresh = await this.prisma.caseStudySection.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!fresh) throw new NotFoundException('Updated section not found');
    return this.map(fresh);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.caseStudySectionMedia.deleteMany({ where: { caseStudySectionId: id } });
    await this.prisma.caseStudySection.delete({ where: { id } });
  }

  async reorder(dto: ReorderSectionsDto): Promise<CaseStudySection[]> {
    await Promise.all(dto.sections.map(s =>
      this.prisma.caseStudySection.update({
        where: { id: s.id },
        data: { order: s.order },
      })
    ));
    return this.findAll(dto.caseStudyId);
  }

  private map(raw: any): CaseStudySection {
    const media: SectionMedia[] = raw.media.map((m: any) => ({
      id: m.id,
      mimeType: m.mimeType,
      blob: m.blob,
    }));
    return {
      id: raw.id,
      caseStudyId: raw.caseStudyId,
      order: raw.order,
      type: raw.type,
      isActive: raw.isActive,
      data: raw.data as any,          // preserves your full banner/content shape
      media,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}
