import {
  Controller, Get, Post, Put, Delete, Param,
  Query, Body, UploadedFile, UseInterceptors, BadRequestException,
  DefaultValuePipe, ParseIntPipe
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NewslettersService } from '../services/newsletters.service';
import { CreateNewsletterDto } from '../dto/create-newsletter.dto';
import { UpdateNewsletterDto } from '../dto/update-newsletter.dto';
import { CtaDto } from '../dto/cta-news-letter.dto';

@Controller('jf/newsletters')
export class NewslettersController {
  constructor(private readonly svc: NewslettersService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(9), ParseIntPipe) size: number
  ) {
    return this.svc.findAll(page, size);
  }

  @Post()
  @UseInterceptors(FileInterceptor('bannerFile', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async create(
    @UploadedFile() bannerFile: Express.Multer.File,
    @Body() body: Record<string, string>
  ) {
    const dto = new CreateNewsletterDto();
    Object.assign(dto, {
      order:   Number(body.order),
      title:   body.title,
      date:    body.date,
      description: body.description,
      category:    body.category,
      isActive: body.isActive === 'true',
    });
    return this.svc.create(dto, bannerFile);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('bannerFile', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async update(
    @Param('id') id: string,
    @UploadedFile() bannerFile: Express.Multer.File,
    @Body() body: Record<string, string>
  ) {
    const dto = new UpdateNewsletterDto();
    if (body.order)       dto.order = Number(body.order);
    if (body.title)       dto.title = body.title;
    if (body.date)        dto.date = body.date;
    if (body.description) dto.description = body.description;
    if (body.category)    dto.category = body.category;
    if (body.isActive !== undefined) dto.isActive = body.isActive === 'true';

    return this.svc.update(id, dto, bannerFile);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Put(':id/cta')
  saveCta(
    @Param('id') id: string,
    @Body() body: CtaDto
  ) {
    return this.svc.saveCta(id, body);
  }
}
