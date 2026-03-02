import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BlogLanguage } from '@prisma/client';
import { BlogCloudinaryService } from './blog-cloudinary.service';
import { UpsertBlogsHeroDto } from '../dto/upsert-blogs-hero.dto';

@Injectable()
export class BlogsHeroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: BlogCloudinaryService,
  ) {}

  async get(lang: BlogLanguage = BlogLanguage.EN) {
    const hero = await this.prisma.blogHeroSection.findFirst({
      include: {
        translations: {
          where: { language: lang },
        },
      },
    });

    if (!hero) {
      return {
        heroImage: null,
        heading: null,
        subheading: null,
        language: lang,
      };
    }

    const t = hero.translations[0] ?? null;
    return {
      heroImage: hero.heroImage,
      heading: t?.heading ?? null,
      subheading: t?.subheading ?? null,
      language: lang,
    };
  }

  async upsert(dto: UpsertBlogsHeroDto) {
    const existing = await this.prisma.blogHeroSection.findFirst();

    // If there is an existing hero image AND a new image is being supplied
    // (or image is being removed), delete the old one from Cloudinary.
    if (existing?.heroImagePublicId) {
      const imageIsChanging =
        dto.heroImage !== undefined &&              // caller is explicitly setting image
        dto.heroImage !== existing.heroImage;       // and it differs from current
      const imageIsBeingRemoved = dto.heroImage === null;

      if (imageIsChanging || imageIsBeingRemoved) {
        await this.cloudinary.deleteBlogImage(existing.heroImagePublicId);
      }
    }

    if (existing) {
      // Update existing singleton
      return this.prisma.blogHeroSection.update({
        where: { id: existing.id },
        data: {
          ...(dto.heroImage !== undefined && { heroImage: dto.heroImage }),
          ...(dto.heroImagePublicId !== undefined && {
            heroImagePublicId: dto.heroImagePublicId,
          }),
          translations: {
            upsert: dto.translations.map((t) => ({
              where: {
                heroSectionId_language: {
                  heroSectionId: existing.id,
                  language: t.language,
                },
              },
              create: {
                language: t.language,
                heading: t.heading ?? null,
                subheading: t.subheading ?? null,
              },
              update: {
                heading: t.heading ?? null,
                subheading: t.subheading ?? null,
              },
            })),
          },
        },
        include: { translations: true },
      });
    }

    // Create the singleton for the first time
    return this.prisma.blogHeroSection.create({
      data: {
        heroImage: dto.heroImage ?? null,
        heroImagePublicId: dto.heroImagePublicId ?? null,
        translations: {
          create: dto.translations.map((t) => ({
            language: t.language,
            heading: t.heading ?? null,
            subheading: t.subheading ?? null,
          })),
        },
      },
      include: { translations: true },
    });
  }
}
