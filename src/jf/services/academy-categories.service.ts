import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAcademyCategoryDto } from '../dto/create-academy-category.dto';
import { UpdateAcademyCategoryDto } from '../dto/update-academy-category.dto';

function toKebab(text: string): string {
  return text
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class AcademyCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.academyCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { guides: true } } },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.academyCategory.findUnique({
      where: { id },
      include: { _count: { select: { guides: true } } },
    });
    if (!cat) throw new NotFoundException(`Category "${id}" not found`);
    return cat;
  }

  async create(dto: CreateAcademyCategoryDto) {
    const slug = toKebab(dto.name);
    const existing = await this.prisma.academyCategory.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Category slug "${slug}" already exists`);
    return this.prisma.academyCategory.create({
      data: { name: dto.name, slug, color: dto.color ?? null },
    });
  }

  async update(id: string, dto: UpdateAcademyCategoryDto) {
    const cat = await this.prisma.academyCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`Category "${id}" not found`);

    const data: any = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
      data.slug = toKebab(dto.name);
      const conflict = await this.prisma.academyCategory.findUnique({
        where: { slug: data.slug },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Category slug "${data.slug}" already exists`);
      }
    }
    if (dto.color !== undefined) data.color = dto.color;

    return this.prisma.academyCategory.update({ where: { id }, data });
  }

  async remove(id: string) {
    const cat = await this.prisma.academyCategory.findUnique({
      where: { id },
      include: { _count: { select: { guides: true } } },
    });
    if (!cat) throw new NotFoundException(`Category "${id}" not found`);
    if (cat._count.guides > 0) {
      throw new ConflictException(
        `Cannot delete: ${cat._count.guides} guide(s) use this category. Reassign them first.`,
      );
    }
    await this.prisma.academyCategory.delete({ where: { id } });
    return { message: `Category "${cat.name}" deleted` };
  }
}
