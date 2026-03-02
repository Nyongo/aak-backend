import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBlogCategoryDto } from '../dto/create-blog-category.dto';

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
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateBlogCategoryDto) {
    const slug = toKebab(dto.name);

    const existing = await this.prisma.blogCategory.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(`Category with slug "${slug}" already exists`);
    }

    return this.prisma.blogCategory.create({
      data: { name: dto.name, slug },
    });
  }
}
