import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BlogLanguage, BlogPostStatus } from '@prisma/client';
import { QueryBlogPostsDto } from '../dto/query-blog-posts.dto';
import { CreateBlogPostDto } from '../dto/create-blog-post.dto';
import { UpdateBlogPostDto } from '../dto/update-blog-post.dto';
import { BlogCloudinaryService } from './blog-cloudinary.service';
import { BlogSlugService } from './blog-slug.service';
import { extractAllPublicIdsFromSections } from '../utils/blog-tiptap.utils';

const DEFAULT_LANG = BlogLanguage.EN;
const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 50;

@Injectable()
export class BlogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: BlogCloudinaryService,
    private readonly slugService: BlogSlugService,
  ) {}

  // ── List ────────────────────────────────────────────────────

  async findAll(query: QueryBlogPostsDto) {
    const lang = (query.lang as BlogLanguage) ?? DEFAULT_LANG;
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(MAX_LIMIT, parseInt(query.limit ?? String(DEFAULT_LIMIT), 10));
    const skip = (page - 1) * limit;

    // Build category filter
    const categoryFilter = query.category
      ? { category: { slug: query.category } }
      : {};

    // Build date range filter
    const dateFilter: any = {};
    if (query.from) dateFilter.gte = new Date(query.from);
    if (query.to) dateFilter.lte = new Date(query.to);
    const publishedAtFilter =
      Object.keys(dateFilter).length > 0 ? { publishedAt: dateFilter } : {};

    // Base where: always only return PUBLISHED posts on the public listing
    const where: any = {
      status: BlogPostStatus.PUBLISHED,
      ...categoryFilter,
      ...publishedAtFilter,
    };

    // Search filter — applies to the translation title and excerpt
    const translationWhere: any = { language: lang };
    if (query.search) {
      const term = query.search.trim();
      translationWhere.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          category: true,
          translations: {
            where: translationWhere,
            select: {
              language: true,
              title: true,
              excerpt: true,
            },
          },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    // Flatten: attach the single translation to each post object
    const items = posts.map((post) => {
      const translation = post.translations[0] ?? null;
      const { translations, ...rest } = post;
      return { ...rest, translation };
    });

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Single post ─────────────────────────────────────────────

  async findOne(slug: string, lang: BlogLanguage = DEFAULT_LANG) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        category: true,
        translations: {
          where: { language: lang },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Blog post "${slug}" not found`);
    }

    const translation = post.translations[0] ?? null;
    const { translations, ...rest } = post;
    return { ...rest, translation };
  }

  // ── Create ──────────────────────────────────────────────────

  async create(dto: CreateBlogPostDto) {
    // Derive slug from the EN title (fallback to first translation)
    const enTranslation =
      dto.translations.find((t) => t.language === BlogLanguage.EN) ??
      dto.translations[0];

    if (!enTranslation) {
      throw new BadRequestException('At least one translation is required');
    }

    const slug = await this.slugService.generateUniqueSlug(enTranslation.title);

    return this.prisma.blogPost.create({
      data: {
        slug,
        heroImage: dto.heroImage ?? null,
        heroImagePublicId: dto.heroImagePublicId ?? null,
        authorName: dto.authorName,
        authorRole: dto.authorRole ?? null,
        categoryId: dto.categoryId ?? null,
        translations: {
          create: dto.translations.map((t) => ({
            language: t.language,
            title: t.title,
            excerpt: t.excerpt,
            sections: t.sections as any,
          })),
        },
      },
      include: {
        category: true,
        translations: true,
      },
    });
  }

  // ── Update ──────────────────────────────────────────────────

  async update(slug: string, dto: UpdateBlogPostDto) {
    const post = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (!post) throw new NotFoundException(`Blog post "${slug}" not found`);

    // If a new hero image is being set, delete the old one from Cloudinary
    if (dto.heroImage !== undefined && dto.heroImagePublicId !== post.heroImagePublicId) {
      await this.cloudinary.deleteBlogImage(post.heroImagePublicId);
    }

    // Update translations using upsert so we can send only the languages that changed
    const translationUpserts = dto.translations?.map((t) => ({
      where: {
        postId_language: {
          postId: post.id,
          language: t.language,
        },
      },
      create: {
        language: t.language,
        title: t.title,
        excerpt: t.excerpt,
        sections: t.sections as any,
      },
      update: {
        title: t.title,
        excerpt: t.excerpt,
        sections: t.sections as any,
      },
    })) ?? [];

    return this.prisma.blogPost.update({
      where: { slug },
      data: {
        ...(dto.heroImage !== undefined && { heroImage: dto.heroImage }),
        ...(dto.heroImagePublicId !== undefined && {
          heroImagePublicId: dto.heroImagePublicId,
        }),
        ...(dto.authorName && { authorName: dto.authorName }),
        ...(dto.authorRole !== undefined && { authorRole: dto.authorRole }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        translations: translationUpserts.length
          ? { upsert: translationUpserts }
          : undefined,
      },
      include: { category: true, translations: true },
    });
  }

  // ── Publish / Unpublish ─────────────────────────────────────

  async togglePublish(slug: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (!post) throw new NotFoundException(`Blog post "${slug}" not found`);

    const newStatus =
      post.status === BlogPostStatus.PUBLISHED
        ? BlogPostStatus.DRAFT
        : BlogPostStatus.PUBLISHED;

    return this.prisma.blogPost.update({
      where: { slug },
      data: {
        status: newStatus,
        publishedAt:
          newStatus === BlogPostStatus.PUBLISHED ? new Date() : null,
      },
    });
  }

  // ── Delete ──────────────────────────────────────────────────

  async remove(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: { translations: true },
    });

    if (!post) throw new NotFoundException(`Blog post "${slug}" not found`);

    // 1. Collect all Cloudinary public IDs to delete
    const publicIdsToDelete: (string | null | undefined)[] = [
      post.heroImagePublicId, // hero image
    ];

    // 2. Extract inline image IDs from all translation sections
    for (const translation of post.translations) {
      const inlineIds = extractAllPublicIdsFromSections(translation.sections);
      publicIdsToDelete.push(...inlineIds);
    }

    // 3. Delete from Cloudinary (non-blocking — DB delete proceeds regardless)
    await this.cloudinary.deleteManyBlogImages(publicIdsToDelete);

    // 4. Delete the DB record (cascade deletes translations via Prisma relation)
    await this.prisma.blogPost.delete({ where: { slug } });

    return { message: `Blog post "${slug}" deleted successfully` };
  }

  // ── CRM: list all (including drafts) ───────────────────────

  async findAllAdmin(query: QueryBlogPostsDto) {
    const lang = (query.lang as BlogLanguage) ?? DEFAULT_LANG;
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(MAX_LIMIT, parseInt(query.limit ?? String(DEFAULT_LIMIT), 10));
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          translations: {
            where: { language: lang },
            select: { language: true, title: true, excerpt: true },
          },
        },
      }),
      this.prisma.blogPost.count(),
    ]);

    const items = posts.map((post) => {
      const translation = post.translations[0] ?? null;
      const { translations, ...rest } = post;
      return { ...rest, translation };
    });

    return {
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
