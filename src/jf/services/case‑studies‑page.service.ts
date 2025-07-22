import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface PageBanner {
  eyebrow:   string;
  headline:  string;
  subtitle?: string;
  imageUrl?: string;
}

export interface PageCta {
  title:       string;
  description: string;
  buttonText:  string;
  buttonLink:  string;
}

@Injectable()
export class CaseStudiesPageService {
  private readonly SINGLETON_ID = 1;

  constructor(private readonly prisma: PrismaService) {}

  // --- Banner ---

  async getBanner(): Promise<PageBanner> {
    const rec = await this.prisma.caseStudiesPageBanner.findUnique({
      where: { id: this.SINGLETON_ID },
    });
    if (rec) {
      const { eyebrow, headline, subtitle, imageUrl } = rec;
      return { eyebrow, headline, subtitle, imageUrl };
    }
    // defaults
    return { eyebrow: '', headline: '', subtitle: '', imageUrl: '' };
  }

  async saveBanner(b: PageBanner): Promise<PageBanner> {
    const up = await this.prisma.caseStudiesPageBanner.upsert({
      where:  { id: this.SINGLETON_ID },
      create: { id: this.SINGLETON_ID, ...b },
      update: { ...b },
    });
    return {
      eyebrow:  up.eyebrow,
      headline: up.headline,
      subtitle: up.subtitle ?? '',
      imageUrl: up.imageUrl ?? '',
    };
  }

  // --- CTA ---

  async getCta(): Promise<PageCta> {
    const rec = await this.prisma.caseStudiesPageCta.findUnique({
      where: { id: this.SINGLETON_ID },
    });
    if (rec) {
      const { title, description, buttonText, buttonLink } = rec;
      return { title, description, buttonText, buttonLink };
    }
    // defaults
    return { title: '', description: '', buttonText: '', buttonLink: '' };
  }

  async saveCta(c: PageCta): Promise<PageCta> {
    const up = await this.prisma.caseStudiesPageCta.upsert({
      where:  { id: this.SINGLETON_ID },
      create: { id: this.SINGLETON_ID, ...c },
      update: { ...c },
    });
    return {
      title:       up.title,
      description: up.description,
      buttonText:  up.buttonText,
      buttonLink:  up.buttonLink,
    };
  }
}
