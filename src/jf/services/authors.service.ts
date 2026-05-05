import { Injectable, NotFoundException } from '@nestjs/common';
import { BlogLanguage } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { BlogCloudinaryService } from './blog-cloudinary.service';
import { CreateAuthorDto } from '../dto/create-author.dto';
import { UpdateAuthorDto } from '../dto/update-author.dto';

function toKebab(text: string): string {
  return text  
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class AuthorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: BlogCloudinaryService,
  ) {}

  // ── Slug helper ───────────────────────────────────────────────
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = toKebab(name);
    let candidate = base;
    let counter   = 2;
    while (true) {
      const existing = await this.prisma.author.findUnique({
        where:  { slug: candidate },
        select: { id: true },
      });
      if (!existing || (excludeId && existing.id === excludeId)) return candidate;
      candidate = `${base}-${counter++}`;
    }
  }

  // ── findAll — used by CRM dropdown and author list ────────────
  // Returns EN role from translation (for display in CRM lists).
  async findAll() {
    const authors = await this.prisma.author.findMany({
      orderBy: { name: 'asc' },
      select: {
        id:        true,
        slug:      true,
        name:      true,
        image:     true,
        createdAt: true,
        translations: {
          where:  { language: BlogLanguage.EN },
          select: { role: true },
        },
      },
    });

    return authors.map(({ translations, ...rest }) => ({
      ...rest,
      role: translations[0]?.role ?? null,
    }));
  }

  // ── findBySlug — used by Angular author page ──────────────────
  // Resolves role + bio for the requested language.
  // Falls back to EN if the requested language has no translation.
  // Always includes the raw translations array so the CRM can
  // populate its language tabs without a second request.
  async findBySlug(slug: string, lang: BlogLanguage = BlogLanguage.EN) {
    const author = await this.prisma.author.findUnique({
      where:   { slug },
      include: { translations: true },
    });
    if (!author) throw new NotFoundException(`Author "${slug}" not found`);

    const { translations, ...rest } = author;

    const resolved =
      translations.find(t => t.language === lang) ??
      translations.find(t => t.language === BlogLanguage.EN) ??
      null;

    return {
      ...rest,
      role: resolved?.role ?? null,
      bio:  resolved?.bio  ?? null,
      // Raw translations included so the CRM can populate both
      // language tabs without needing a separate request.
      translations: translations.map(t => ({
        language: t.language,
        role:     t.role,
        bio:      t.bio,
      })),
    };
  }

  // ── create ────────────────────────────────────────────────────
  async create(dto: CreateAuthorDto) {
    const slug = await this.generateUniqueSlug(dto.name);
    const { translations, ...fields } = dto;

    return this.prisma.author.create({
      data: {
        slug,
        name:            fields.name,
        image:           fields.image           ?? null,
        imagePublicId:   fields.imagePublicId   ?? null,
        yearsAtJF:       fields.yearsAtJF       ?? null,
        email:           fields.email           ?? null,
        location:        fields.location        ?? null,
        education:       fields.education       ?? null,
        expertise:       fields.expertise       ?? null,
        metaTitle:       fields.metaTitle       ?? null,
        metaDescription: fields.metaDescription ?? null,
        metaKeywords:    fields.metaKeywords    ?? null,
        ...(translations?.length && {
          translations: {
            create: translations.map(t => ({
              language: t.language,
              role:     t.role ?? null,
              bio:      t.bio  ?? null,
            })),
          },
        }),
      },
      include: { translations: true },
    });
  }

  // ── update ────────────────────────────────────────────────────
  async update(slug: string, dto: UpdateAuthorDto) {
    const author = await this.prisma.author.findUnique({
      where:  { slug },
      select: { id: true, imagePublicId: true },
    });
    if (!author) throw new NotFoundException(`Author "${slug}" not found`);

    // Delete old Cloudinary image if a new one is being set
    if (
      dto.image !== undefined &&
      dto.imagePublicId !== author.imagePublicId &&
      author.imagePublicId
    ) {
      await this.cloudinary.deleteBlogImage(author.imagePublicId);
    }

    const { translations, ...fields } = dto;

    // Upsert translations
    if (translations?.length) {
      await Promise.all(
        translations.map(t =>
          this.prisma.authorTranslation.upsert({
            where:  { authorId_language: { authorId: author.id, language: t.language } },
            create: { authorId: author.id, language: t.language, role: t.role ?? null, bio: t.bio ?? null },
            update: { role: t.role ?? null, bio: t.bio ?? null },
          }),
        ),
      );
    }

    return this.prisma.author.update({
      where: { slug },
      data:  {
        ...(fields.name            !== undefined && { name:            fields.name }),
        ...(fields.image           !== undefined && { image:           fields.image }),
        ...(fields.imagePublicId   !== undefined && { imagePublicId:   fields.imagePublicId }),
        ...(fields.yearsAtJF       !== undefined && { yearsAtJF:       fields.yearsAtJF }),
        ...(fields.email           !== undefined && { email:           fields.email }),
        ...(fields.location        !== undefined && { location:        fields.location }),
        ...(fields.education       !== undefined && { education:       fields.education }),
        ...(fields.expertise       !== undefined && { expertise:       fields.expertise }),
        ...(fields.metaTitle       !== undefined && { metaTitle:       fields.metaTitle }),
        ...(fields.metaDescription !== undefined && { metaDescription: fields.metaDescription }),
        ...(fields.metaKeywords    !== undefined && { metaKeywords:    fields.metaKeywords }),
      },
      include: { translations: true },
    });
  }

  // ── remove ────────────────────────────────────────────────────
  async remove(slug: string) {
    const author = await this.prisma.author.findUnique({ where: { slug } });
    if (!author) throw new NotFoundException(`Author "${slug}" not found`);
    if (author.imagePublicId) {
      await this.cloudinary.deleteBlogImage(author.imagePublicId);
    }
    // Cascade deletes author_translations via onDelete: Cascade
    await this.prisma.author.delete({ where: { slug } });
    return { message: `Author "${slug}" deleted` };
  }
}
