import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, UseInterceptors, UploadedFiles, BadRequestException
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { NewsletterSectionsService } from '../services/newsletter-sections.service';
import { CreateNewsletterSectionDto } from '../dto/create-newsletter-section.dto';
import { UpdateNewsletterSectionDto } from '../dto/update-newsletter-section.dto';
import { SectionType } from '@prisma/client';
import { ReorderSectionsDto } from '../dto/reorder-sections-newsletter.dto';

@Controller('jf/newsletters/:newsletterId/sections')
export class NewsletterSectionsController {
  constructor(private readonly svc: NewsletterSectionsService) {}

  @Get()
  findAll(@Param('newsletterId') nid: string) {
    return this.svc.findAll(nid);
  }

  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'mediaFiles', maxCount: 10 }]))
  async create(
    @Param('newsletterId') newsletterId: string,
    @Body() body: Record<string, any>,
    @UploadedFiles() files: { mediaFiles?: Express.Multer.File[] },
  ) {
    const order = Number(body.order);
    if (isNaN(order)) throw new BadRequestException('order must be a number');
    let data: any;
    try {
      data = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
    } catch {
      throw new BadRequestException('data must be valid JSON');
    }
    if (![SectionType.banner, SectionType.content].includes(body.type)) {
      throw new BadRequestException('type must be banner|content');
    }
    const dto: CreateNewsletterSectionDto = {
      newsletterId,
      order,
      type: body.type,
      data,
    };
    return this.svc.create(dto, files.mediaFiles || []);
  }

  @Put(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'mediaFiles', maxCount: 10 }]))
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @UploadedFiles() files: { mediaFiles?: Express.Multer.File[] },
  ) {
    const dto: UpdateNewsletterSectionDto = {};
    if (body.order !== undefined) {
      const o = Number(body.order);
      if (isNaN(o)) throw new BadRequestException('order must be a number');
      dto.order = o;
    }
    if (body.type !== undefined) {
      if (![SectionType.banner, SectionType.content].includes(body.type)) {
        throw new BadRequestException('type must be banner|content');
      }
      dto.type = body.type;
    }
    if (body.data !== undefined) {
      try {
        dto.data = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
      } catch {
        throw new BadRequestException('data must be valid JSON');
      }
    }
    return this.svc.update(id, dto, files.mediaFiles || []);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderSectionsDto) {
    return this.svc.reorder(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
