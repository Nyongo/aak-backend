import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNewsletterDto } from '../dto/create-newsletter.dto';
import { UpdateNewsletterDto } from '../dto/update-newsletter.dto';
import { CtaDto } from '../dto/cta-news-letter.dto';

@Injectable()
export class NewslettersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, size: number) {
    const [items, total] = await Promise.all([
      this.prisma.newsletter.findMany({
        skip: (page - 1) * size,
        take: size,
        orderBy: { order: 'asc' },
      }),
      this.prisma.newsletter.count(),
    ]);
    // convert blob→dataURL here
    return {
      items: items.map(n => this.attachBannerUrl(n)),
      total,
    };
  }

  async create(dto: CreateNewsletterDto, file?: Express.Multer.File) {
    const data: any = { ...dto };
    if (file) {
      data.bannerMime = file.mimetype;
      data.bannerBlob = file.buffer;
    }
    const created = await this.prisma.newsletter.create({ data });
    return this.attachBannerUrl(created);
  }

  async findOne(id: string) {
    const rec = await this.prisma.newsletter.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException(`Newsletter ${id} not found`);
    return this.attachBannerUrl(rec);
  }

  async update(id: string, dto: UpdateNewsletterDto, file?: Express.Multer.File) {
    const updateData: any = { ...dto };
    if (file) {
      updateData.bannerMime = file.mimetype;
      updateData.bannerBlob = file.buffer;
    }
    const updated = await this.prisma.newsletter.update({
      where: { id },
      data: updateData,
    });
    return this.attachBannerUrl(updated);
  }

  async remove(id: string) {
    await this.prisma.newsletter.delete({ where: { id } });
  }

  async saveCta(id: string, dto: CtaDto) {
    await this.prisma.newsletterCta.upsert({
      where: { newsletterId: id },
      create: { newsletterId: id, ...dto },
      update: dto,
    });
  }

  private attachBannerUrl(rec: any) {
    if (rec.bannerBlob && rec.bannerMime) {
      rec.bannerUrl = `data:${rec.bannerMime};base64,${Buffer.from(rec.bannerBlob).toString('base64')}`;
    }
    return rec;
  }
}
