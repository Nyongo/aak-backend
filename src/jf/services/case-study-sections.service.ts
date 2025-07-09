import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCaseStudySectionDto } from '../dto/create-case-study-section.dto';
import { UpdateCaseStudySectionDto } from '../dto/update-case-study-section.dto';
import {
  CaseStudySection,
  SectionMedia,
} from '../interfaces/case-study-section.interface';

@Injectable()
export class CaseStudySectionsService {
  private readonly logger = new Logger(CaseStudySectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fetch all sections for a given caseStudyId, sorted by `order` */
  async findAll(caseStudyId: string): Promise<CaseStudySection[]> {
    const rawSections = await this.prisma.caseStudySection.findMany({
      where: { caseStudyId },
      orderBy: { order: 'asc' },
      include: { media: true },
    });
    return rawSections.map((sec) => this.mapPrisma(sec));
  }

  /** Add a new section */
  async create(
    dto: CreateCaseStudySectionDto,
    files: Express.Multer.File[] = [],
  ): Promise<CaseStudySection> {
    // 1. Create the section record
    const sec = await this.prisma.caseStudySection.create({
      data: {
        caseStudyId: dto.caseStudyId,
        order: dto.order,
        type: dto.type,
        data: dto.data,
      },
    });

    // 2. Optionally create media blobs
    if (files.length) {
      await Promise.all(
        files.map((file) =>
          this.prisma.caseStudySectionMedia.create({
            data: {
              caseStudySectionId: sec.id,
              mimeType: file.mimetype,
              blob: file.buffer,
            },
          }),
        ),
      );
    }

    // 3. Re-fetch to include media
    const fresh = await this.prisma.caseStudySection.findUnique({
      where: { id: sec.id },
      include: { media: true },
    });
    if (!fresh) {
      throw new NotFoundException('Failed to retrieve created section');
    }
    return this.mapPrisma(fresh);
  }

  /** Update an existing section */
  async update(
    id: string,
    dto: UpdateCaseStudySectionDto,
    files: Express.Multer.File[] = [],
  ): Promise<CaseStudySection> {
    // 1. Check existence
    const existing = await this.prisma.caseStudySection.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Section not found');
    }

    // 2. Update JSON fields
    await this.prisma.caseStudySection.update({
      where: { id },
      data: {
        order: dto.order ?? existing.order,
        type: dto.type ?? existing.type,
        data: dto.data ?? existing.data,
      },
    });

    // 3. Append new media if provided
    if (files.length) {
      await Promise.all(
        files.map((file) =>
          this.prisma.caseStudySectionMedia.create({
            data: {
              caseStudySectionId: id,
              mimeType: file.mimetype,
              blob: file.buffer,
            },
          }),
        ),
      );
    }

    // 4. Re-fetch with media
    const fresh = await this.prisma.caseStudySection.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!fresh) {
      throw new NotFoundException('Failed to retrieve updated section');
    }
    return this.mapPrisma(fresh);
  }

  /** Remove a section and its media */
  async remove(id: string): Promise<void> {
    // 1. Delete media rows
    await this.prisma.caseStudySectionMedia.deleteMany({
      where: { caseStudySectionId: id },
    });
    // 2. Delete the section itself
    await this.prisma.caseStudySection.delete({ where: { id } });
  }

  /** Helper to map Prisma return to our interface */
  private mapPrisma(raw: any): CaseStudySection {
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
      data: raw.data,
      media,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
