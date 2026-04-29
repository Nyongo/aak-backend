import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAcademyTagDto }  from '../dto/create-academy-tag.dto';
import { UpdateAcademyTagDto }  from '../dto/update-academy-tag.dto';

function toKebab(text: string): string {
  return text
    .toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class AcademyTagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.academyTag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { guides: true } } },
    });
  }

  async findOne(id: string) {
    const tag = await this.prisma.academyTag.findUnique({
      where: { id },
      include: { _count: { select: { guides: true } } },
    });
    if (!tag) throw new NotFoundException(`Tag "${id}" not found`);
    return tag;
  }

  async create(dto: CreateAcademyTagDto) {
    const slug = toKebab(dto.name);
    const existing = await this.prisma.academyTag.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Tag slug "${slug}" already exists`);
    return this.prisma.academyTag.create({ data: { name: dto.name, slug } });
  }

  async update(id: string, dto: UpdateAcademyTagDto) {
    const tag = await this.prisma.academyTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException(`Tag "${id}" not found`);
    if (!dto.name) return tag;

    const slug = toKebab(dto.name);
    const conflict = await this.prisma.academyTag.findUnique({ where: { slug } });
    if (conflict && conflict.id !== id) {
      throw new ConflictException(`Tag slug "${slug}" already exists`);
    }
    return this.prisma.academyTag.update({ where: { id }, data: { name: dto.name, slug } });
  }

  async remove(id: string) {
    const tag = await this.prisma.academyTag.findUnique({
      where: { id },
      include: { _count: { select: { guides: true } } },
    });
    if (!tag) throw new NotFoundException(`Tag "${id}" not found`);
    if (tag._count.guides > 0) {
      throw new ConflictException(
        `Cannot delete: ${tag._count.guides} guide(s) use this tag. Remove it from guides first.`,
      );
    }
    await this.prisma.academyTag.delete({ where: { id } });
    return { message: `Tag "${tag.name}" deleted` };
  }
}
