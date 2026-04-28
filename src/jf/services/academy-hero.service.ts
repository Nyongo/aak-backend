import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AcademyLanguage } from '@prisma/client';

interface UpsertAcademyHeroDto {
  translations: { language: 'EN' | 'KIS'; subheading?: string | null }[];
}

@Injectable()
export class AcademyHeroService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Read ──────────────────────────────────────────────────

  async get(lang: AcademyLanguage = AcademyLanguage.EN) {
    const hero = await this.prisma.academyHeroSection.findFirst({
      include: { translations: { where: { language: lang } } },
    });
    if (!hero) return { subheading: null };
    const t = hero.translations[0] ?? null;
    return { subheading: t?.subheading ?? null };
  }

  /** Returns all translations — used by CRM edit form */
  async getAll() {
    const hero = await this.prisma.academyHeroSection.findFirst({
      include: { translations: true },
    });
    if (!hero) return { id: null, translations: [] };
    return hero;
  }

  // ── Create / Update (singleton upsert) ────────────────────

  async upsert(dto: UpsertAcademyHeroDto) {
    let hero = await this.prisma.academyHeroSection.findFirst();
    if (!hero) hero = await this.prisma.academyHeroSection.create({ data: {} });

    for (const t of dto.translations) {
      await this.prisma.academyHeroTranslation.upsert({
        where: {
          heroSectionId_language: {
            heroSectionId: hero.id,
            language: t.language as AcademyLanguage,
          },
        },
        create: {
          heroSectionId: hero.id,
          language:      t.language as AcademyLanguage,
          subheading:    t.subheading ?? null,
        },
        update: { subheading: t.subheading ?? null },
      });
    }

    return this.prisma.academyHeroSection.findUnique({
      where: { id: hero.id },
      include: { translations: true },
    });
  }

  // ── Delete / Reset (clears all hero content) ─────────────

  async reset() {
    const hero = await this.prisma.academyHeroSection.findFirst();
    if (!hero) return { message: 'No hero section to reset' };
    // Cascade deletes translations via Prisma relation
    await this.prisma.academyHeroSection.delete({ where: { id: hero.id } });
    return { message: 'Academy hero section reset successfully' };
  }
}
