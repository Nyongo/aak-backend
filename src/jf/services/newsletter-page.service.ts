import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PageBannerDto } from '../dto/page-banner.dto';
import { PageCtaDto } from '../dto/page-cta.dto';
import { NewsletterPageBanner, NewsletterPageCta } from '@prisma/client';

@Injectable()
export class NewsletterPageService {
  private readonly SINGLETON = 'singleton';

  constructor(private readonly prisma: PrismaService) {}

  async getBanner(): Promise<PageBannerDto> {
    const rec = await this.prisma.newsletterPageBanner.findUnique({
      where: { id: this.SINGLETON },
    });
    if (!rec) return { eyebrow: '', headline: '', subtitle: '', imageUrl: '' };
    return {
      eyebrow: rec.eyebrow,
      headline: rec.headline,
      subtitle: rec.subtitle || '',
      imageUrl: rec.imageUrl || '',
    };
  }

  async saveBanner(dto: PageBannerDto, file?: Express.Multer.File): Promise<PageBannerDto> {
    const data: any = { ...dto };
    if (file) {
      data.imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }
    const up = await this.prisma.newsletterPageBanner.upsert({
      where: { id: this.SINGLETON },
      create: { id: this.SINGLETON, ...data },
      update: data,
    });
    return {
      eyebrow: up.eyebrow,
      headline: up.headline,
      subtitle: up.subtitle || '',
      imageUrl: up.imageUrl || '',
    };
  }

  async getCta(): Promise<PageCtaDto> {
    const rec = await this.prisma.newsletterPageCta.findUnique({
      where: { id: this.SINGLETON },
    });
    if (!rec) return { title: '', description: '', buttonText: '', buttonLink: '' };
    return {
      title: rec.title,
      description: rec.description,
      buttonText: rec.buttonText,
      buttonLink: rec.buttonLink,
    };
  }

  async saveCta(dto: PageCtaDto): Promise<PageCtaDto> {
    const up = await this.prisma.newsletterPageCta.upsert({
      where: { id: this.SINGLETON },
      create: { id: this.SINGLETON, ...dto },
      update: dto,
    });
    return {
      title: up.title,
      description: up.description,
      buttonText: up.buttonText,
      buttonLink: up.buttonLink,
    };
  }
}
