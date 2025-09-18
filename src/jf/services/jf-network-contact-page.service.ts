import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateJFNetworkContactPageDto,
  UpdateJFNetworkContactPageDto,
} from '../dto/jf-network-contact-page.dto';

@Injectable()
export class JFNetworkContactPageService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateJFNetworkContactPageDto) {
    return this.prisma.contactMessage.create({ data: data as any });
  }

  findAll() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.contactMessage.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateJFNetworkContactPageDto) {
    return this.prisma.contactMessage.update({
      where: { id },
      data: data as any,
    });
  }

  remove(id: string) {
    return this.prisma.contactMessage.delete({ where: { id } });
  }
}
