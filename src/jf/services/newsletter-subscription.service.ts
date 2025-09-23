import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNewsletterSubscriptionDto } from '../dto/create-newsletter-subscription.dto';
import { UpdateNewsletterSubscriptionDto } from '../dto/update-newsletter-subscription.dto';


@Injectable()
export class NewsletterSubscriptionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNewsletterSubscriptionDto) {
    try {
      const data = {
        name: dto.name,
        email: dto.email,
        organization: dto.organization ?? null,
        interests: dto.interests ?? null,
        platform: dto.platform ?? null,
      };
      return await this.prisma.newsletterSubscription.create({ data });
    } catch (err: any) {
      // handle unique constraint on email
      if (err?.code === 'P2002' && err?.meta?.target?.includes('email')) {
        throw new ConflictException('Email already subscribed');
      }
      throw err;
    }
  }

  async findAll() {
    return this.prisma.newsletterSubscription.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const item = await this.prisma.newsletterSubscription.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Newsletter subscription not found');
    return item;
  }

  async update(id: string, dto: UpdateNewsletterSubscriptionDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.organization !== undefined) data.organization = dto.organization;
    if (dto.interests !== undefined) data.interests = dto.interests;
    if (dto.platform !== undefined) data.platform = dto.platform;

    try {
      return await this.prisma.newsletterSubscription.update({ where: { id }, data });
    } catch (err: any) {
      if (err?.code === 'P2002' && err?.meta?.target?.includes('email')) {
        throw new ConflictException('Email already subscribed');
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.newsletterSubscription.delete({ where: { id } });
  }
}
