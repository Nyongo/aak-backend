import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { AcademyGuideStatus, AcademyLanguage } from '@prisma/client';
import { CreateAcademyGuideDto }   from '../dto/create-academy-guide.dto';
import { UpdateAcademyGuideDto }   from '../dto/update-academy-guide.dto';
import { QueryAcademyGuidesDto }   from '../dto/query-academy-guides.dto';

const DEFAULT_LANG  = AcademyLanguage.EN;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT     = 50;

@Injectable()
export class AcademyGuidesService {
  constructor(
    private readonly prisma:      PrismaService,
    private readonly httpService: HttpService,
  ) {}

  // ── oEmbed ────────────────────────────────────────────────

  private async fetchOEmbed(url: string): Promise<string | null> {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await firstValueFrom(this.httpService.get(oembedUrl));
      return res.data?.thumbnail_url ?? null;
    } catch {
      return null;
    }
  }

  // ── Shared helpers ────────────────────────────────────────

  private includeFor(lang: AcademyLanguage) {
    return {
      category: true,
      tags:     { include: { tag: true } },
      translations: { where: { language: lang } },
    };
  }

  private includeAll() {
    return {
      category: true,
      tags:     { include: { tag: true } },
      translations: true,
      _count:   { select: { subscribers: true } },
    };
  }

  private flatten(raw: any) {
    const translation = raw.translations?.[0] ?? null;
    const tags = (raw.tags as any[]).map((t: any) => t.tag);
    const { translations, tags: _t, ...rest } = raw;
    return { ...rest, translation, tags };
  }

  // ── Normalise bodyContent ─────────────────────────────────
  // Belt-and-braces: even if @Transform missed something,
  // this guarantees a plain JSON-serialisable array reaches Prisma.

  private normaliseBodyContent(value: any): any[] {
    if (!Array.isArray(value)) return [];
    return JSON.parse(JSON.stringify(value)); // strips any non-serialisable values
  }

  // ── Public list ───────────────────────────────────────────

  async findAll(query: QueryAcademyGuidesDto) {
    const lang  = (query.lang?.toUpperCase() as AcademyLanguage) ?? DEFAULT_LANG;
    const page  = Math.max(1, parseInt(query.page  ?? '1',               10));
    const limit = Math.min(MAX_LIMIT, parseInt(query.limit ?? String(DEFAULT_LIMIT), 10));
    const skip  = (page - 1) * limit;

    const where: any = {
      status: { in: [AcademyGuideStatus.PUBLISHED, AcademyGuideStatus.COMING_SOON] },
    };
    if (query.category) where.category = { slug: query.category };

    const [guides, total] = await Promise.all([
      this.prisma.academyGuide.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: this.includeFor(lang),
      }),
      this.prisma.academyGuide.count({ where }),
    ]);

    return {
      data: guides.map(g => this.flatten(g)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Featured ──────────────────────────────────────────────

  async findFeatured(lang: AcademyLanguage = DEFAULT_LANG) {
    const guide = await this.prisma.academyGuide.findFirst({
      where: { isFeatured: true, status: AcademyGuideStatus.PUBLISHED },
      include: this.includeFor(lang),
    });
    return guide ? this.flatten(guide) : null;
  }

  // ── Single (public) ───────────────────────────────────────

  async findOne(id: string, lang: AcademyLanguage = DEFAULT_LANG) {
    const guide = await this.prisma.academyGuide.findUnique({
      where: { id },
      include: this.includeFor(lang),
    });
    if (!guide) throw new NotFoundException(`Guide "${id}" not found`);
    return this.flatten(guide);
  }

  // ── Single (admin — all translations) ─────────────────────

  async findOneAdmin(id: string) {
    const guide = await this.prisma.academyGuide.findUnique({
      where: { id },
      include: this.includeAll(),
    });
    if (!guide) throw new NotFoundException(`Guide "${id}" not found`);
    const tags = (guide.tags as any[]).map((t: any) => t.tag);
    const { tags: _t, ...rest } = guide;
    return { ...rest, tags };
  }

  // ── Admin list ────────────────────────────────────────────

  async findAllAdmin(query: QueryAcademyGuidesDto) {
    const lang  = (query.lang?.toUpperCase() as AcademyLanguage) ?? DEFAULT_LANG;
    const page  = Math.max(1, parseInt(query.page  ?? '1',               10));
    const limit = Math.min(MAX_LIMIT, parseInt(query.limit ?? String(DEFAULT_LIMIT), 10));
    const skip  = (page - 1) * limit;

    const [guides, total] = await Promise.all([
      this.prisma.academyGuide.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeFor(lang),
      }),
      this.prisma.academyGuide.count(),
    ]);

    return {
      data: guides.map(g => this.flatten(g)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Create ────────────────────────────────────────────────

  async create(dto: CreateAcademyGuideDto) {
    if (!dto.translations?.length) {
      throw new BadRequestException('At least one translation is required');
    }

    const thumbnail =
      dto.youtubeThumbnail ?? (await this.fetchOEmbed(dto.youtubeUrl)) ?? undefined;

    if (dto.isFeatured) {
      await this.prisma.academyGuide.updateMany({
        where: { isFeatured: true },
        data:  { isFeatured: false },
      });
    }

    return this.prisma.academyGuide.create({
      data: {
        youtubeUrl:         dto.youtubeUrl,
        youtubeThumbnail:   thumbnail ?? null,
        duration:           dto.duration   ?? null,
        status:             (dto.status as AcademyGuideStatus) ?? AcademyGuideStatus.DRAFT,
        isFeatured:         dto.isFeatured ?? false,
        scheduledPublishAt: dto.scheduledPublishAt ? new Date(dto.scheduledPublishAt) : null,
        categoryId:         dto.categoryId ?? null,
        publishedAt:        dto.status === 'PUBLISHED' ? new Date() : null,
        tags: dto.tagIds?.length
          ? { create: dto.tagIds.map(tagId => ({ tag: { connect: { id: tagId } } })) }
          : undefined,
        translations: {
          create: dto.translations.map(t => ({
            language:    t.language as AcademyLanguage,
            title:       t.title,
            description: t.description,
            bodyContent: this.normaliseBodyContent(t.bodyContent),
          })),
        },
      },
      include: this.includeFor(DEFAULT_LANG),
    });
  }

  // ── Update ────────────────────────────────────────────────
  //
  // Translations are handled via deleteMany + createMany inside a
  // $transaction instead of nested upsert.  The upsert approach with
  // Prisma Json fields can silently ignore the updated value under
  // certain versions, causing the empty-array-accumulation bug.

  async update(id: string, dto: UpdateAcademyGuideDto) {
    const guide = await this.prisma.academyGuide.findUnique({ where: { id } });
    if (!guide) throw new NotFoundException(`Guide "${id}" not found`);

    let thumbnail = dto.youtubeThumbnail;
    if (dto.youtubeUrl && dto.youtubeUrl !== guide.youtubeUrl && !thumbnail) {
      thumbnail = (await this.fetchOEmbed(dto.youtubeUrl)) ?? undefined;
    }

    if (dto.isFeatured) {
      await this.prisma.academyGuide.updateMany({
        where: { isFeatured: true, id: { not: id } },
        data:  { isFeatured: false },
      });
    }

    if (dto.tagIds !== undefined) {
      await this.prisma.academyGuideTag.deleteMany({ where: { guideId: id } });
    }

    // ── Translations: delete existing rows, recreate with new content ──
    // This is more reliable than nested upsert for Json fields because
    // it guarantees bodyContent is always a clean SET operation in Prisma.
    if (dto.translations?.length) {
      await this.prisma.$transaction([
        this.prisma.academyGuideTranslation.deleteMany({ where: { guideId: id } }),
        this.prisma.academyGuideTranslation.createMany({
          data: dto.translations.map(t => ({
            guideId:     id,
            language:    t.language as AcademyLanguage,
            title:       t.title,
            description: t.description,
            bodyContent: this.normaliseBodyContent(t.bodyContent),
          })),
        }),
      ]);
    }

    return this.prisma.academyGuide.update({
      where: { id },
      data: {
        ...(dto.youtubeUrl                       && { youtubeUrl: dto.youtubeUrl }),
        ...(thumbnail !== undefined              && { youtubeThumbnail: thumbnail }),
        ...(dto.duration  !== undefined          && { duration: dto.duration }),
        ...(dto.status    !== undefined          && { status: dto.status as AcademyGuideStatus }),
        ...(dto.isFeatured !== undefined         && { isFeatured: dto.isFeatured }),
        ...(dto.scheduledPublishAt !== undefined && {
          scheduledPublishAt: new Date(dto.scheduledPublishAt),
        }),
        ...(dto.categoryId !== undefined         && { categoryId: dto.categoryId }),
        ...(dto.status === 'PUBLISHED' && !guide.publishedAt && { publishedAt: new Date() }),
        ...(dto.tagIds !== undefined && dto.tagIds.length > 0 && {
          tags: { create: dto.tagIds.map(tagId => ({ tag: { connect: { id: tagId } } })) },
        }),
      },
      include: this.includeFor(DEFAULT_LANG),
    });
  }

  // ── Toggle featured ───────────────────────────────────────

  async toggleFeatured(id: string) {
    const guide = await this.prisma.academyGuide.findUnique({ where: { id } });
    if (!guide) throw new NotFoundException(`Guide "${id}" not found`);

    if (!guide.isFeatured) {
      await this.prisma.academyGuide.updateMany({
        where: { isFeatured: true },
        data:  { isFeatured: false },
      });
    }

    return this.prisma.academyGuide.update({
      where: { id },
      data:  { isFeatured: !guide.isFeatured },
    });
  }

  // ── Delete ────────────────────────────────────────────────

  async remove(id: string) {
    const guide = await this.prisma.academyGuide.findUnique({ where: { id } });
    if (!guide) throw new NotFoundException(`Guide "${id}" not found`);
    await this.prisma.academyGuide.delete({ where: { id } });
    return { message: `Guide "${id}" deleted` };
  }

  // ── Subscribe ─────────────────────────────────────────────

  async subscribe(guideId: string, email: string) {
    const guide = await this.prisma.academyGuide.findUnique({ where: { id: guideId } });
    if (!guide) throw new NotFoundException(`Guide "${guideId}" not found`);

    await this.prisma.academyGuideSubscriber.upsert({
      where:  { guideId_email: { guideId, email } },
      create: { guideId, email },
      update: {},
    });

    return { message: 'Subscribed successfully' };
  }

  // ── Cron helpers ──────────────────────────────────────────

  async autoPublishScheduled(): Promise<number> {
    const result = await this.prisma.academyGuide.updateMany({
      where: {
        status:             AcademyGuideStatus.COMING_SOON,
        scheduledPublishAt: { lte: new Date() },
      },
      data: { status: AcademyGuideStatus.PUBLISHED, publishedAt: new Date() },
    });
    return result.count;
  }

  async getGuidesNeedingNotification(hoursAhead: number, type: '24h' | '1h') {
    const now   = new Date();
    const upper = new Date(now.getTime() + hoursAhead       * 3_600_000);
    const lower = new Date(now.getTime() + (hoursAhead - 1) * 3_600_000);

    const sentFilter = type === '24h'
      ? { notificationSent24h: false }
      : { notificationSent1h:  false };

    return this.prisma.academyGuide.findMany({
      where: {
        status:             AcademyGuideStatus.COMING_SOON,
        scheduledPublishAt: { gte: lower, lte: upper },
        ...sentFilter,
      },
      include: {
        translations: true,
        subscribers:  { select: { email: true } },
      },
    });
  }

  async markNotificationSent(guideId: string, type: '24h' | '1h') {
    return this.prisma.academyGuide.update({
      where: { id: guideId },
      data:  type === '24h'
        ? { notificationSent24h: true }
        : { notificationSent1h:  true },
    });
  }
}
