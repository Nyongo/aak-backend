import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNewsletterDto } from '../dto/create-newsletter.dto';
import { UpdateNewsletterDto } from '../dto/update-newsletter.dto';
import { Newsletter } from '../interfaces/newsletter.interface';

@Injectable()
export class NewslettersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNewsletterDto, image: Express.Multer.File): Promise<Newsletter> {
    const nl = await this.prisma.newsletter.create({
      data: {
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        category: dto.category,
        imageBlob: image.buffer,
        imageMimeType: image.mimetype,
      },
    });
    return nl as Newsletter;
  }

  findAll(): Promise<Newsletter[]> {
    return this.prisma.newsletter.findMany({
      orderBy: { date: 'desc' },
    }) as Promise<Newsletter[]>;
  }

  async findOne(id: string): Promise<Newsletter> {
    const nl = await this.prisma.newsletter.findUnique({ where: { id } });
    if (!nl) throw new NotFoundException(`Newsletter ${id} not found`);
    return nl as Newsletter;
  }

  async update(
    id: string,
    dto: UpdateNewsletterDto,
    image?: Express.Multer.File,
  ): Promise<Newsletter> {
    await this.findOne(id);
    const data: any = {
      title: dto.title,
      description: dto.description,
      date: dto.date ? new Date(dto.date) : undefined,
      category: dto.category,
    };
    if (image) {
      data.imageBlob = image.buffer;
      data.imageMimeType = image.mimetype;
    }
    const updated = await this.prisma.newsletter.update({
      where: { id },
      data,
    });
    return updated as Newsletter;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.newsletter.delete({ where: { id } });
  }
}
