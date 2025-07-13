import {
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNewsletterSectionDto } from '../dto/create-newsletter-section.dto';
import { UpdateNewsletterSectionDto } from '../dto/update-newsletter-section.dto';
import { SectionType, NewsletterSection } from '../interfaces/newsletter-section.interface';

@Injectable()
export class NewsletterSectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private map(raw: any): NewsletterSection {
    return {
      id: raw.id,
      newsletterId: raw.newsletterId,
      order: raw.order,
      type: raw.type as SectionType,
      data: raw.data,
      media: raw.media.map((m: any) => ({
        id: m.id,
        mimeType: m.mimeType,
        blob: m.blob,
      })),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  async findAll(newsletterId: string): Promise<NewsletterSection[]> {
    const raws = await this.prisma.newsletterSection.findMany({
      where: { newsletterId },
      orderBy: { order: 'asc' },
      include: { media: true },
    });
    return raws.map(this.map);
  }

  async create(
    dto: CreateNewsletterSectionDto,
    files: Express.Multer.File[],
  ): Promise<NewsletterSection> {
    const sec = await this.prisma.newsletterSection.create({
      data: {
        newsletterId: dto.newsletterId,
        order: dto.order,
        type: dto.type,
        data: dto.data,
      },
    });
    for (const file of files ?? []) {
      if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
        throw new UnsupportedMediaTypeException('Only images/videos allowed');
      }
      await this.prisma.newsletterSectionMedia.create({
        data: {
          newsletterSectionId: sec.id,
          mimeType: file.mimetype,
          blob: file.buffer,
        },
      });
    }
    const fresh = await this.prisma.newsletterSection.findUnique({
      where: { id: sec.id },
      include: { media: true },
    });
    if (!fresh) throw new NotFoundException('Section not found after creation');
    return this.map(fresh);
  }

  async update(
    id: string,
    dto: UpdateNewsletterSectionDto,
    files: Express.Multer.File[],
  ): Promise<NewsletterSection> {
    const existing = await this.prisma.newsletterSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Section ${id} not found`);

    await this.prisma.newsletterSection.update({
      where: { id },
      data: {
        order: dto.order ?? existing.order,
        type: dto.type ?? existing.type,
        data: dto.data ?? existing.data,
      },
    });
    for (const file of files ?? []) {
      if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
        throw new UnsupportedMediaTypeException('Only images/videos allowed');
      }
      await this.prisma.newsletterSectionMedia.create({
        data: {
          newsletterSectionId: id,
          mimeType: file.mimetype,
          blob: file.buffer,
        },
      });
    }
    const fresh = await this.prisma.newsletterSection.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!fresh) throw new NotFoundException('Section not found after update');
    return this.map(fresh);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.newsletterSectionMedia.deleteMany({ where: { newsletterSectionId: id } });
    await this.prisma.newsletterSection.delete({ where: { id } });
  }
}
