import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BlogCloudinaryService } from './blog-cloudinary.service';
import { CreateBlogCategoryDto } from '../dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from '../dto/update-blog-category.dto';

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
export class BlogCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: BlogCloudinaryService,
  ) {}

  async findAll() {
    return this.prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.blogCategory.findUnique({
      where: { slug },
    });
    if (!category) {
      throw new NotFoundException(`Category "${slug}" not found`);
    }
    return category;
  }

  async create(dto: CreateBlogCategoryDto) {
    const slug = toKebab(dto.name);

    const existing = await this.prisma.blogCategory.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Category with slug "${slug}" already exists`);
    }

    return this.prisma.blogCategory.create({
      data: {
        name: dto.name,
        slug,
        metaTitle: dto.metaTitle ?? null,
        metaDescription: dto.metaDescription ?? null,
        metaKeywords: dto.metaKeywords ?? null,
        metaImage: dto.metaImage ?? null,
        metaImagePublicId: dto.metaImagePublicId ?? null,
      },
    });
  }

  async update(slug: string, dto: UpdateBlogCategoryDto) {
    const category = await this.prisma.blogCategory.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException(`Category "${slug}" not found`);

    // Delete old Cloudinary image if a new one is being supplied
    if (
      dto.metaImage !== undefined &&
      dto.metaImagePublicId !== category.metaImagePublicId &&
      category.metaImagePublicId
    ) {
      await this.cloudinary.deleteBlogImage(category.metaImagePublicId);
    }

    return this.prisma.blogCategory.update({
      where: { slug },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.metaTitle !== undefined     && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
        ...(dto.metaKeywords !== undefined  && { metaKeywords: dto.metaKeywords }),
        ...(dto.metaImage !== undefined     && { metaImage: dto.metaImage }),
        ...(dto.metaImagePublicId !== undefined && { metaImagePublicId: dto.metaImagePublicId }),
      },
    });
  }

  async remove(slug: string) {
    const category = await this.prisma.blogCategory.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException(`Category "${slug}" not found`);

    // Delete OG image from Cloudinary (non-blocking)
    await this.cloudinary.deleteBlogImage(category.metaImagePublicId);

    // Posts referencing this category have categoryId set to NULL via onDelete: SetNull
    await this.prisma.blogCategory.delete({ where: { slug } });

    return { message: `Category "${slug}" deleted` };
  }
}
