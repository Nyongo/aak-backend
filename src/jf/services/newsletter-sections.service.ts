import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNewsletterSectionDto } from '../dto/create-newsletter-section.dto';
import { UpdateNewsletterSectionDto } from '../dto/update-newsletter-section.dto';
import { ReorderSectionsDto } from '../dto/reorder-sections-newsletter.dto';

@Injectable()
export class NewsletterSectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(newsletterId: string) {
    const raw = await this.prisma.newsletterSection.findMany({
      where: { newsletterId },
      orderBy: { order: 'asc' },
      include: { media: true },
    });
    return raw.map(sec => ({
      ...sec,
      createdAt: sec.createdAt.toISOString(),
      updatedAt: sec.updatedAt.toISOString(),
    }));
  }

  async create(dto: CreateNewsletterSectionDto, files: Express.Multer.File[] = []) {
    const sec = await this.prisma.newsletterSection.create({
      data: { ...dto },
    });
    if (files.length) {
      await Promise.all(files.map(f =>
        this.prisma.newsletterSectionMedia.create({
          data: {
            newsletterSectionId: sec.id,
            mimeType: f.mimetype,
            blob: f.buffer,
          },
        }),
      ));
    }
    return this.findAll(sec.newsletterId).then(all => all.find(s => s.id === sec.id));
  }

  async update(id: string, dto: UpdateNewsletterSectionDto, files: Express.Multer.File[] = []) {
    const existing = await this.prisma.newsletterSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Section not found');
    await this.prisma.newsletterSection.update({
      where: { id },
      data: { ...dto },
    });
    if (files.length) {
      await Promise.all(files.map(f =>
        this.prisma.newsletterSectionMedia.create({
          data: { newsletterSectionId: id, mimeType: f.mimetype, blob: f.buffer },
        }),
      ));
    }
    return this.findAll(existing.newsletterId).then(all => all.find(s => s.id === id));
  }

  async remove(id: string) {
    await this.prisma.newsletterSectionMedia.deleteMany({ where: { newsletterSectionId: id } });
    await this.prisma.newsletterSection.delete({ where: { id } });
  }

  async reorder(dto: ReorderSectionsDto) {
    await Promise.all(dto.sections.map(s =>
      this.prisma.newsletterSection.update({
        where: { id: s.id },
        data: { order: s.order },
      }),
    ));
    return this.findAll(dto.newsletterId);
  }
}
